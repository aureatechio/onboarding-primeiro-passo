import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  Image as ImageIcon,
  Layers3,
  Loader2,
  Minus,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import TopBarLogo from '../components/TopBarLogo';
import { colorHex, designTokens, TYPE } from '../theme/design-tokens';

function formatDate(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('pt-BR');
  } catch {
    return String(value);
  }
}

function StatusBadge({ status }) {
  const map = {
    pending: { label: 'Pendente', bg: '#FFF7E8', color: '#B45309', icon: Clock3 },
    processing: { label: 'Processando', bg: '#EFF6FF', color: '#1D4ED8', icon: Loader2 },
    completed: { label: 'Concluido', bg: '#ECFDF3', color: '#047857', icon: CheckCircle2 },
    partial: { label: 'Parcial', bg: '#FFF7E8', color: '#B45309', icon: AlertCircle },
    failed: { label: 'Falhou', bg: '#FEF2F2', color: '#B91C1C', icon: AlertCircle },
  };
  const def = map[status] || { label: 'Sem job', bg: '#F3F4F6', color: '#4B5563', icon: Layers3 };
  const Icon = def.icon;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: def.bg,
        color: def.color,
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <Icon size={14} className={status === 'processing' ? 'animate-spin' : ''} />
      {def.label}
    </span>
  );
}

function DataRow({ label, value, mono = false }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px minmax(0,1fr)',
        gap: 10,
        alignItems: 'start',
        padding: '8px 0',
        borderBottom: '1px solid #F1F5F9',
      }}
    >
      <div
        style={{
          ...TYPE.caption,
          color: '#64748B',
          fontFamily: mono ? designTokens.fontFamily.mono : designTokens.fontFamily.primary,
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...TYPE.bodySmall,
          color: '#0F172A',
          wordBreak: 'break-word',
          fontFamily: mono ? designTokens.fontFamily.mono : designTokens.fontFamily.primary,
        }}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function useAiCampaignMonitor() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const compraId = params.get('compra_id') || '';
  const jobId = params.get('job_id') || '';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!baseUrl) {
        setError('VITE_SUPABASE_URL nao configurada.');
        setLoading(false);
        return;
      }
      if (!compraId && !jobId) {
        setError('Informe compra_id ou job_id na URL.');
        setLoading(false);
        return;
      }

      if (!silent) setLoading(true);
      if (silent) setRefreshing(true);

      try {
        const query = new URLSearchParams();
        if (compraId) query.set('compra_id', compraId);
        if (jobId) query.set('job_id', jobId);
        const response = await fetch(`${baseUrl}/functions/v1/get-ai-campaign-monitor?${query.toString()}`);
        const payload = await response.json();

        if (!response.ok || !payload?.success) {
          throw new Error(payload?.message || 'Falha ao carregar monitor.');
        }

        setData(payload);
        setError('');
        setLastUpdatedAt(new Date().toISOString());
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro inesperado.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [baseUrl, compraId, jobId]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!data) return undefined;
    const status = data?.job?.status;
    const intervalMs = status === 'processing' || status === 'pending' ? 3000 : 15000;
    const id = window.setInterval(() => {
      fetchData({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [data, fetchData]);

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdatedAt,
    compraId,
    jobId,
    reload: fetchData,
  };
}

export default function AiStep2Monitor() {
  const { data, loading, refreshing, error, lastUpdatedAt, compraId, jobId, reload } = useAiCampaignMonitor();

  const [viewerIndex, setViewerIndex] = useState(-1);
  const [zoom, setZoom] = useState(1);
  const [activeSection, setActiveSection] = useState('overview');

  const assets = data?.assets || [];
  const onboarding = data?.onboarding || {};
  const identity = onboarding?.identity || null;
  const briefing = onboarding?.briefing || null;
  const job = data?.job || null;
  const progress = data?.progress || { total_expected: 12, total_generated: 0, percent: 0 };

  const openViewer = (index) => {
    setViewerIndex(index);
    setZoom(1);
  };

  const closeViewer = () => {
    setViewerIndex(-1);
    setZoom(1);
  };

  const currentAsset = viewerIndex >= 0 ? assets[viewerIndex] : null;
  const sidebarSections = useMemo(
    () => [
      { id: 'overview', label: 'Visao Geral' },
      { id: 'gallery', label: 'Galeria' },
      { id: 'onboarding-data', label: 'Dados do Onboarding' },
      { id: 'errors', label: 'Erros e Diagnostico' },
    ],
    []
  );

  useEffect(() => {
    const sectionElements = sidebarSections
      .map((section) => document.getElementById(section.id))
      .filter(Boolean);

    if (sectionElements.length === 0) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visibleEntries.length > 0) {
          setActiveSection(visibleEntries[0].target.id);
        }
      },
      {
        root: null,
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0.2, 0.35, 0.5],
      }
    );

    sectionElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sidebarSections, loading, error, data]);

  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(sectionId);
  }, []);

  const downloadImage = (url, fallbackName) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.download = fallbackName || 'asset.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0B0F19', color: '#0F172A' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0,1fr)', minHeight: '100vh' }}>
        <aside
          style={{
            background: '#000000',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <TopBarLogo height={24} maxWidth={156} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sidebarSections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={activeSection === section.id ? 'page' : undefined}
                style={{
                  borderRadius: 10,
                  padding: '10px 12px',
                  background: activeSection === section.id ? 'rgba(232,53,109,0.16)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${activeSection === section.id ? 'rgba(232,53,109,0.4)' : 'rgba(255,255,255,0.14)'}`,
                  color: '#E2E8F0',
                  fontSize: 13,
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: designTokens.motion.transitionFast,
                }}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 12 }}>
            <p style={{ ...TYPE.caption, color: '#94A3B8' }}>Entrada</p>
            <p style={{ ...TYPE.bodySmall, color: '#E2E8F0' }}>compra_id: {compraId || '-'}</p>
            <p style={{ ...TYPE.bodySmall, color: '#E2E8F0' }}>job_id: {jobId || '-'}</p>
          </div>
        </aside>

        <main style={{ background: '#FFFFFF', padding: 24 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <section
              id="overview"
              style={{
                border: '1px solid #E2E8F0',
                borderRadius: 16,
                padding: 18,
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div>
                <h1 style={{ ...TYPE.h2, color: '#0F172A' }}>Geracao de imagens IA</h1>
                <p style={{ ...TYPE.bodySmall, color: '#64748B', marginTop: 4 }}>
                  Acompanhe status, previews, downloads e dados coletados no onboarding.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={job?.status} />
                <button
                  type="button"
                  onClick={() => reload({ silent: true })}
                  style={{
                    border: '1px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    borderRadius: 10,
                    padding: '8px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                  }}
                >
                  <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                  Atualizar
                </button>
              </div>
            </section>

            {error ? (
              <div
                style={{
                  border: '1px solid #FECACA',
                  background: '#FEF2F2',
                  color: '#991B1B',
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16,
                }}
              >
                <strong>Erro:</strong> {error}
              </div>
            ) : null}

            {loading ? (
              <div className="animate-pulse" style={{ display: 'grid', gap: 14 }}>
                <div style={{ height: 100, borderRadius: 14, background: '#F1F5F9' }} />
                <div style={{ height: 280, borderRadius: 14, background: '#F1F5F9' }} />
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 16 }}>
                  {[
                    { label: 'Total esperado', value: progress.total_expected ?? 12 },
                    { label: 'Total gerado', value: progress.total_generated ?? 0 },
                    { label: 'Percentual', value: `${progress.percent ?? 0}%` },
                    { label: 'Ultima atualizacao', value: formatDate(lastUpdatedAt) },
                  ].map((item) => (
                    <div key={item.label} style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 12 }}>
                      <p style={{ ...TYPE.caption, color: '#64748B' }}>{item.label}</p>
                      <p style={{ ...TYPE.h3, color: '#0F172A', marginTop: 8 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ ...TYPE.caption, color: '#64748B' }}>Andamento</span>
                    <span style={{ ...TYPE.caption, color: '#334155' }}>{progress.percent ?? 0}%</span>
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: '#E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress.percent ?? 0}%` }}
                      transition={{ duration: 0.45 }}
                      style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${colorHex.red}, ${colorHex.redGradientEndDark})`,
                      }}
                    />
                  </div>
                </div>

                <section id="gallery" style={{ marginBottom: 16, scrollMarginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <h2 style={{ ...TYPE.h3, color: '#0F172A' }}>Previews gerados</h2>
                    <p style={{ ...TYPE.caption, color: '#64748B' }}>{assets.length} assets</p>
                  </div>
                  {assets.length === 0 ? (
                    <div
                      style={{
                        border: '1px dashed #CBD5E1',
                        borderRadius: 14,
                        padding: 20,
                        textAlign: 'center',
                        color: '#64748B',
                      }}
                    >
                      Nenhum preview disponivel ainda.
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                      {assets.map((asset, index) => (
                        <motion.div
                          key={asset.id || `${asset.group_name}-${asset.format}-${index}`}
                          whileHover={{ y: -2 }}
                          transition={{ duration: 0.2 }}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 14,
                            overflow: 'hidden',
                            background: '#FFFFFF',
                          }}
                        >
                          <div style={{ position: 'relative', height: 190, background: '#F8FAFC' }}>
                            {asset.image_url ? (
                              <img
                                src={asset.image_url}
                                alt={`${asset.group_name} ${asset.format}`}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
                                <ImageIcon size={28} />
                              </div>
                            )}
                          </div>
                          <div style={{ padding: 12 }}>
                            <p style={{ ...TYPE.caption, color: '#64748B' }}>
                              {(asset.group_name || '-').toUpperCase()} · {asset.format || '-'}
                            </p>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                              <button
                                type="button"
                                onClick={() => openViewer(index)}
                                style={{
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  borderRadius: 8,
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                <Eye size={14} />
                                Ampliar
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  downloadImage(asset.image_url, `${asset.group_name || 'asset'}-${asset.format || 'image'}.png`)
                                }
                                style={{
                                  border: 'none',
                                  background: '#0F172A',
                                  color: '#FFFFFF',
                                  borderRadius: 8,
                                  padding: '6px 10px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </section>

                <section
                  id="onboarding-data"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 12, scrollMarginTop: 16 }}
                >
                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                    <h3 style={{ ...TYPE.h3, color: '#0F172A', marginBottom: 10 }}>Dados do onboarding</h3>
                    <DataRow label="Cliente" value={onboarding?.client?.name} />
                    <DataRow label="Celebridade" value={onboarding?.celebrity?.name} />
                    <DataRow label="Status pagamento" value={onboarding?.compra?.checkout_status} />
                    <DataRow label="Status contrato" value={onboarding?.compra?.clicksign_status} />
                    <DataRow label="Producao" value={identity?.production_path} />
                    <DataRow label="Escolha identidade" value={identity?.choice} />
                    <DataRow label="Fonte" value={identity?.font_choice} />
                    <DataRow label="Paleta" value={(identity?.brand_palette || []).join(', ')} mono />
                    <DataRow label="Notas" value={identity?.campaign_notes} />
                    <DataRow label="Briefing modo" value={briefing?.mode} />
                    <DataRow label="Briefing texto" value={briefing?.brief_text} />
                    <DataRow label="Transcript status" value={briefing?.transcript_status} />
                  </div>

                  <div style={{ border: '1px solid #E2E8F0', borderRadius: 14, padding: 14 }}>
                    <h3 style={{ ...TYPE.h3, color: '#0F172A', marginBottom: 10 }}>Uploads e anexos</h3>
                    <DataRow label="Logo path" value={identity?.uploads?.logo_path} mono />
                    <DataRow label="Imagens enviadas" value={String(identity?.uploads?.campaign_images_paths?.length || 0)} />
                    <DataRow label="Audio path" value={briefing?.audio_path} mono />
                    <DataRow label="Audio duracao (s)" value={String(briefing?.audio_duration_sec || '-')} />
                    <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {identity?.uploads?.logo_url ? (
                        <button
                          type="button"
                          onClick={() => window.open(identity.uploads.logo_url, '_blank')}
                          style={{
                            border: '1px solid #CBD5E1',
                            background: '#FFFFFF',
                            borderRadius: 8,
                            padding: '8px 10px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            fontWeight: 600,
                          }}
                        >
                          Abrir logo enviado
                        </button>
                      ) : null}
                      {briefing?.audio_url ? (
                        <audio controls style={{ width: '100%' }}>
                          <source src={briefing.audio_url} />
                        </audio>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section
                  id="errors"
                  style={{ border: '1px solid #FECACA', borderRadius: 14, padding: 14, marginTop: 14, scrollMarginTop: 16 }}
                >
                  <h3 style={{ ...TYPE.h3, color: '#7F1D1D', marginBottom: 10 }}>Erros do pipeline</h3>
                  {data?.errors?.length > 0 ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {data.errors.map((err) => (
                        <div
                          key={err.id}
                          style={{
                            borderRadius: 10,
                            background: '#FEF2F2',
                            border: '1px solid #FECACA',
                            padding: 10,
                          }}
                        >
                          <p style={{ ...TYPE.caption, color: '#991B1B' }}>
                            {err.group_name} · {err.format} · tentativa {err.attempt}
                          </p>
                          <p style={{ ...TYPE.bodySmall, color: '#7F1D1D', marginTop: 4 }}>{err.error_message}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ ...TYPE.bodySmall, color: '#7F1D1D' }}>
                      Nenhum erro registrado para este job.
                    </p>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>

      {currentAsset ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2,6,23,0.92)',
            zIndex: 50,
            display: 'grid',
            gridTemplateRows: 'auto 1fr',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16, color: '#E2E8F0' }}>
            <div>
              <p style={{ ...TYPE.caption, color: '#94A3B8' }}>
                {(currentAsset.group_name || '-').toUpperCase()} · {currentAsset.format || '-'}
              </p>
              <p style={{ ...TYPE.bodySmall, color: '#E2E8F0' }}>{viewerIndex + 1} de {assets.length}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.2).toFixed(2))))}
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#E2E8F0',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <Minus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.2).toFixed(2))))}
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#E2E8F0',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => downloadImage(currentAsset.image_url, `${currentAsset.group_name}-${currentAsset.format}.png`)}
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#E2E8F0',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <Download size={16} />
              </button>
              <button
                type="button"
                onClick={closeViewer}
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#E2E8F0',
                  borderRadius: 8,
                  padding: 8,
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ position: 'relative', display: 'grid', placeItems: 'center', overflow: 'auto', padding: 20 }}>
            <img
              src={currentAsset.image_url}
              alt={`${currentAsset.group_name} ${currentAsset.format}`}
              style={{
                maxWidth: '90%',
                maxHeight: '85vh',
                objectFit: 'contain',
                transform: `scale(${zoom})`,
                transition: 'transform 0.2s ease',
              }}
            />

            <button
              type="button"
              onClick={() => setViewerIndex((idx) => (idx <= 0 ? assets.length - 1 : idx - 1))}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(15,23,42,0.8)',
                color: '#E2E8F0',
                borderRadius: 999,
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => setViewerIndex((idx) => (idx >= assets.length - 1 ? 0 : idx + 1))}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(15,23,42,0.8)',
                color: '#E2E8F0',
                borderRadius: 999,
                width: 38,
                height: 38,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
