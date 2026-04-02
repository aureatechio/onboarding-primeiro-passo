/**
 * Split completion logic for checkout (2 meios + boleto parcelado).
 * Used by process-checkout, cielo-webhook, check-payment-status.
 */

import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export interface CheckoutSessionForSplit {
  id: string;
  compra_id: string;
  split_group_id: string | null;
}

interface SplitGroupForCompletion {
  id: string;
  split_type: string | null;
  parent_split_group_id: string | null;
  sessoes_pagas: number;
  total_sessoes: number;
}

export interface SplitCompletionResult {
  allPaid: boolean;
  splitType: string | null;
}

export interface OmieTriggerDecision {
  shouldTrigger: boolean;
  reason:
    | 'single_payment_confirmed'
    | 'split_first_payment_confirmed'
    | 'split_counter_pending_after_completed'
    | 'split_group_not_found_fallback'
    | 'split_group_lookup_error_fallback';
  splitContext: {
    splitGroupId: string | null;
    splitType: string | null;
    sessoesPagas: number | null;
    totalSessoes: number | null;
  };
}

export const DUAL_PAYMENT_BOLETO_MIN_DUE_DAYS = 30;

export interface ResolveBoletoDueDaysParams {
  supabase: SupabaseClient;
  splitGroupId: string | null;
  sessionId: string;
  baseDueDays: number;
}

export interface ResolveBoletoDueDaysResult {
  dueDays: number;
  appliedDualPaymentMin: boolean;
  siblingMethod: 'pix' | 'cartao' | null;
}

/**
 * Applies the dual payment boleto minimum due-date policy.
 * Rule: when a dual split contains boleto + (pix|cartao), boleto due days must be at least 30.
 */
export async function resolveBoletoDueDaysForSplit(
  params: ResolveBoletoDueDaysParams
): Promise<ResolveBoletoDueDaysResult> {
  const { supabase, splitGroupId, sessionId, baseDueDays } = params;

  if (!splitGroupId) {
    return {
      dueDays: baseDueDays,
      appliedDualPaymentMin: false,
      siblingMethod: null,
    };
  }

  const { data: dualGroup, error: dualGroupError } = await supabase
    .from('checkout_split_groups')
    .select('id')
    .eq('id', splitGroupId)
    .eq('split_type', 'dual_payment')
    .maybeSingle();

  if (dualGroupError || !dualGroup) {
    return {
      dueDays: baseDueDays,
      appliedDualPaymentMin: false,
      siblingMethod: null,
    };
  }

  const { data: siblingSession, error: siblingError } = await supabase
    .from('checkout_sessions')
    .select('metodo_pagamento')
    .eq('split_group_id', splitGroupId)
    .neq('id', sessionId)
    .not('split_index', 'is', null)
    .in('metodo_pagamento', ['pix', 'cartao'])
    .order('split_index', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (siblingError || !siblingSession) {
    return {
      dueDays: baseDueDays,
      appliedDualPaymentMin: false,
      siblingMethod: null,
    };
  }

  const siblingMethod = siblingSession.metodo_pagamento as 'pix' | 'cartao';
  const dueDays = Math.max(baseDueDays, DUAL_PAYMENT_BOLETO_MIN_DUE_DAYS);

  return {
    dueDays,
    appliedDualPaymentMin: dueDays !== baseDueDays,
    siblingMethod,
  };
}

async function incrementSplitGroup(
  supabase: SupabaseClient,
  groupId: string
): Promise<SplitGroupForCompletion | null> {
  const { data: group, error } = await supabase.rpc('increment_split_paid', {
    p_group_id: groupId,
  });

  if (error || !group) {
    console.error('[SPLIT] Erro ao atualizar grupo:', error);
    return null;
  }

  return {
    id: group.id,
    split_type: group.split_type ?? null,
    parent_split_group_id: group.parent_split_group_id ?? null,
    sessoes_pagas: group.sessoes_pagas ?? 0,
    total_sessoes: group.total_sessoes ?? 0,
  };
}

/**
 * After a session in a split group is paid, atomically increment sessoes_pagas
 * and return whether the group is fully paid. Caller must then:
 * - If allPaid: update compras.checkout_status = 'pago', trigger NFS-e
 * - If !allPaid: update compras.checkout_status = 'parcialmente_pago', do NOT trigger NFS-e
 */
export async function handleSplitCompletion(
  supabase: SupabaseClient,
  session: CheckoutSessionForSplit
): Promise<SplitCompletionResult> {
  if (!session.split_group_id) {
    return { allPaid: true, splitType: null };
  }

  const group = await incrementSplitGroup(supabase, session.split_group_id);
  if (!group) {
    return { allPaid: false, splitType: null };
  }

  if (group.total_sessoes <= 0) {
    return { allPaid: false, splitType: group.split_type };
  }

  const allPaid = group.sessoes_pagas >= group.total_sessoes;

  const { error } = await supabase
    .from('checkout_split_groups')
    .update({
      status: allPaid ? 'completed' : 'partial',
      updated_at: new Date().toISOString(),
    })
    .eq('id', session.split_group_id);

  if (error) {
    console.error('[SPLIT] Erro ao atualizar status do grupo:', error);
    return { allPaid: false, splitType: group.split_type };
  }

  if (allPaid && group.split_type === 'boleto_parcelado' && group.parent_split_group_id) {
    try {
      const parentGroup = await incrementSplitGroup(supabase, group.parent_split_group_id);

      if (!parentGroup) {
        return { allPaid: false, splitType: group.split_type };
      }

      const parentAllPaid = parentGroup.sessoes_pagas >= parentGroup.total_sessoes;

      const { error: parentStatusError } = await supabase
        .from('checkout_split_groups')
        .update({
          status: parentAllPaid ? 'completed' : 'partial',
          updated_at: new Date().toISOString(),
        })
        .eq('id', group.parent_split_group_id);

      if (parentStatusError) {
        console.error('[SPLIT] Erro ao atualizar status do split pai:', parentStatusError);
        return { allPaid: false, splitType: group.split_type };
      }

      return { allPaid: parentAllPaid, splitType: parentGroup.split_type };
    } catch (error) {
      console.error('[SPLIT] Erro ao atualizar split pai:', error);
      return { allPaid: false, splitType: group.split_type };
    }
  }

  return { allPaid, splitType: group.split_type };
}

export async function shouldTriggerOmieEmission(
  supabase: SupabaseClient,
  session: CheckoutSessionForSplit
): Promise<OmieTriggerDecision> {
  if (!session.split_group_id) {
    return {
      shouldTrigger: true,
      reason: 'single_payment_confirmed',
      splitContext: {
        splitGroupId: null,
        splitType: null,
        sessoesPagas: null,
        totalSessoes: null,
      },
    };
  }

  try {
    const { data: splitGroup, error } = await supabase
      .from('checkout_split_groups')
      .select('id, split_type, sessoes_pagas, total_sessoes')
      .eq('id', session.split_group_id)
      .maybeSingle();

    if (error) {
      return {
        shouldTrigger: true,
        reason: 'split_group_lookup_error_fallback',
        splitContext: {
          splitGroupId: session.split_group_id,
          splitType: null,
          sessoesPagas: null,
          totalSessoes: null,
        },
      };
    }

    if (!splitGroup) {
      return {
        shouldTrigger: true,
        reason: 'split_group_not_found_fallback',
        splitContext: {
          splitGroupId: session.split_group_id,
          splitType: null,
          sessoesPagas: null,
          totalSessoes: null,
        },
      };
    }

    const sessoesPagas = Number(splitGroup.sessoes_pagas ?? 0);
    const totalSessoes = Number(splitGroup.total_sessoes ?? 0);

    if (sessoesPagas >= 1) {
      return {
        shouldTrigger: true,
        reason: 'split_first_payment_confirmed',
        splitContext: {
          splitGroupId: splitGroup.id,
          splitType: splitGroup.split_type ?? null,
          sessoesPagas,
          totalSessoes,
        },
      };
    }

    // Fallback defensivo: se chegou em caminho de pagamento concluido
    // mas o contador ainda nao refletiu, priorizamos nao perder faturamento.
    return {
      shouldTrigger: true,
      reason: 'split_counter_pending_after_completed',
      splitContext: {
        splitGroupId: splitGroup.id,
        splitType: splitGroup.split_type ?? null,
        sessoesPagas,
        totalSessoes,
      },
    };
  } catch {
    return {
      shouldTrigger: true,
      reason: 'split_group_lookup_error_fallback',
      splitContext: {
        splitGroupId: session.split_group_id,
        splitType: null,
        sessoesPagas: null,
        totalSessoes: null,
      },
    };
  }
}
