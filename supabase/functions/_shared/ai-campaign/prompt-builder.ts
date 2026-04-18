export const GROUPS = ['moderna', 'clean', 'retail'] as const
export const FORMATS = ['1:1', '4:5', '16:9', '9:16'] as const

export type GroupName = (typeof GROUPS)[number]
export type FormatName = (typeof FORMATS)[number]

export interface BriefingContext {
  objetivo_campanha?: string
  publico_alvo?: string
  tom_voz?: string
  mensagem_central?: string
  cta_principal?: string
}

export interface InsightPeca {
  variacao: number
  diferencial?: string
  formato?: string
  plataforma?: string
  gancho?: string
  chamada_principal?: string
  texto_apoio?: string
  cta?: string
  direcao_criativa?: string
}

export interface PromptInput {
  globalRules: string
  clientName: string
  celebName: string
  brandPalette: string[]
  fontChoice: string
  campaignNotes?: string
  briefing?: BriefingContext
  insightsPecas?: InsightPeca[]
  groupDirections: Record<GroupName, string>
  formatInstructions: Record<FormatName, string>
}

export interface HashOptions {
  campaignImageUrl?: string
  referenceSignature?: string
  promptVersion: string
  globalRulesVersion: string
}

export function buildPrompt(
  input: PromptInput,
  group: GroupName,
  format: FormatName,
  variationIndex?: number,
): string {
  const sections = [
    input.globalRules,
    '',
    '---',
    '',
    `## CLIENT BRIEF`,
    `- Company: ${input.clientName}`,
    `- Celebrity: ${input.celebName}`,
    `- Brand Colors: ${input.brandPalette.join(', ')}`,
    `- Font: ${input.fontChoice}`,
  ]

  if (input.campaignNotes?.trim()) {
    sections.push(`- Additional Notes: ${input.campaignNotes.trim()}`)
  }

  if (input.briefing) {
    const b = input.briefing
    const briefingLines: string[] = []
    if (b.objetivo_campanha) briefingLines.push(`- Objective: ${b.objetivo_campanha}`)
    if (b.publico_alvo) briefingLines.push(`- Target Audience: ${b.publico_alvo}`)
    if (b.tom_voz) briefingLines.push(`- Tone of Voice: ${b.tom_voz}`)
    if (b.mensagem_central) briefingLines.push(`- Core Message: ${b.mensagem_central}`)
    if (b.cta_principal) briefingLines.push(`- Primary CTA: ${b.cta_principal}`)
    if (briefingLines.length > 0) {
      sections.push('', '---', '', '## CAMPAIGN CONTEXT (from AI Briefing)')
      sections.push(...briefingLines)
    }
  }

  const insight = variationIndex != null
    ? input.insightsPecas?.find((p) => p.variacao === variationIndex)
    : undefined
  if (insight) {
    const insightLines: string[] = []
    if (insight.gancho) insightLines.push(`- Hook: ${insight.gancho}`)
    if (insight.chamada_principal) insightLines.push(`- Main Call: ${insight.chamada_principal}`)
    if (insight.texto_apoio) insightLines.push(`- Support Text: ${insight.texto_apoio}`)
    if (insight.cta) insightLines.push(`- CTA: ${insight.cta}`)
    if (insight.direcao_criativa) insightLines.push(`- Creative Direction: ${insight.direcao_criativa}`)
    if (insightLines.length > 0) {
      sections.push('', '---', '', '## CREATIVE DIRECTION (from AI Insights)')
      sections.push(...insightLines)
    }
  }

  sections.push('', '---', '')
  sections.push(input.groupDirections[group])
  sections.push('', '---', '')
  sections.push(input.formatInstructions[format])
  sections.push('', '---', '')
  sections.push(
    'IMPORTANT: Generate a single, high-quality commercial advertising image following ALL the rules above. The celebrity photo MUST remain 100% untouched (same person, pose, expression, skin tone, clothing). The provided logo MUST be used as-is — do NOT recolor, redraw, or stylize it. All text MUST be in Brazilian Portuguese.'
  )

  return sections.join('\n')
}

export async function computeInputHashAsync(
  input: PromptInput,
  options: HashOptions,
): Promise<string> {
  const canonical = JSON.stringify({
    clientName: input.clientName,
    celebName: input.celebName,
    brandPalette: [...input.brandPalette].sort(),
    fontChoice: input.fontChoice,
    campaignNotes: input.campaignNotes?.trim() || '',
    briefing: input.briefing ?? null,
    insightsPecas: input.insightsPecas ?? null,
    groupDirections: input.groupDirections,
    formatInstructions: input.formatInstructions,
    campaignImageUrl: options.campaignImageUrl?.trim() || '',
    referenceSignature: options.referenceSignature?.trim() || '',
    promptVersion: options.promptVersion,
    globalRulesVersion: options.globalRulesVersion,
  })
  const encoder = new TextEncoder()
  const data = encoder.encode(canonical)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
