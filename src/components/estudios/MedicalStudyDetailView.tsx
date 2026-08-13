import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Printer,
  Eye,
  Trash2,
  RefreshCw,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { useMedicalStudiesStore } from '../../store/useMedicalStudiesStore';
import { getMedicalStudyFileUrl } from '../../services/apiService';
import { MedicalStudyParameterGrid } from './MedicalStudyParameterGrid';
import { MedicalStudyExplanation } from './MedicalStudyExplanation';
import { MedicalStudyProcessingStepper } from './MedicalStudyProcessingStepper';
import { isProcessingStatus, sortParameters } from '../../utils/medicalStudyHelpers';

interface MedicalStudyDetailViewProps {
  studyId: string;
  onBack: () => void;
}

type DetailTab = 'resumen' | 'parametros' | 'explicacion' | 'texto';

function formatDate(value?: string) {
  if (!value) return 'Fecha no detectada';
  try {
    return new Date(value.includes('T') ? value : `${value}T12:00:00`).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

export function MedicalStudyDetailView({ studyId, onBack }: MedicalStudyDetailViewProps) {
  const loadStudy = useMedicalStudiesStore((s) => s.loadStudy);
  const deleteStudy = useMedicalStudiesStore((s) => s.deleteStudy);
  const reprocessStudy = useMedicalStudiesStore((s) => s.reprocessStudy);
  const loadParameterTimeline = useMedicalStudiesStore((s) => s.loadParameterTimeline);
  const selectedStudy = useMedicalStudiesStore((s) => s.selectedStudy);
  const parameterTimeline = useMedicalStudiesStore((s) => s.parameterTimeline);
  const timelineKey = useMedicalStudiesStore((s) => s.timelineKey);
  const backgroundJobs = useMedicalStudiesStore((s) => s.backgroundJobs);
  const loading = useMedicalStudiesStore((s) => s.loading);
  const error = useMedicalStudiesStore((s) => s.error);

  const [tab, setTab] = useState<DetailTab>('resumen');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  const study = selectedStudy?.id === studyId ? selectedStudy : null;
  const isBackground = !!backgroundJobs[studyId];
  const processing = study ? isProcessingStatus(study.status) || isBackground : isBackground;

  useEffect(() => {
    void loadStudy(studyId);
  }, [studyId, loadStudy]);

  useEffect(() => {
    if (!processing) return undefined;
    const timer = setInterval(() => {
      void loadStudy(studyId);
    }, 3500);
    return () => clearInterval(timer);
  }, [processing, studyId, loadStudy]);

  useEffect(() => {
    if (study && study.parameters.length > 0 && tab === 'resumen' && processing) {
      setTab('parametros');
    }
  }, [study, processing, tab]);

  const { abnormal } = useMemo(
    () => (study ? sortParameters(study.parameters) : { abnormal: [], normal: [] }),
    [study],
  );

  const uniqueParameterKeys = useMemo(() => {
    if (!study) return [];
    const keys = new Map<string, string>();
    for (const p of study.parameters) {
      keys.set(p.parameterKey, p.parameterName);
    }
    return [...keys.entries()];
  }, [study]);

  const openOriginal = async () => {
    const { url } = await getMedicalStudyFileUrl(studyId);
    setViewerUrl(url);
    setTab('resumen');
  };

  const handleShare = async () => {
    const { url, filename, mimeType } = await getMedicalStudyFileUrl(studyId);
    if (navigator.share) {
      try {
        await navigator.share({ title: filename, url });
        return;
      } catch {
        /* fallback */
      }
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    void mimeType;
  };

  const handlePrint = async () => {
    const { url } = await getMedicalStudyFileUrl(studyId);
    const win = window.open(url, '_blank');
    win?.addEventListener('load', () => win.print());
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este estudio? Se borrará el archivo original y todos los datos.')) return;
    const ok = await deleteStudy(studyId);
    if (ok) onBack();
  };

  const handleReprocess = async (stages: Array<'extract' | 'structure' | 'explain'>) => {
    await reprocessStudy(studyId, stages);
  };

  if (!study && loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-body text-[#707a6c]">
        Cargando estudio...
      </div>
    );
  }

  if (!study) {
    return (
      <div className="space-y-4 pb-8">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} className="mr-2 inline" /> Volver
        </Button>
        <div className="rounded-[1.5rem] bg-red-50 px-4 py-4">
          <p className="font-body font-semibold text-red-800">No se pudo cargar el estudio.</p>
          {error && <p className="mt-1 font-body text-sm text-red-700">{error}</p>}
          <Button type="button" variant="secondary" className="mt-3" onClick={() => void loadStudy(studyId)}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-8">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 rounded-full p-2 text-[#226046] hover:bg-[#edefe6]"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-2xl font-bold text-[#191c17]">
            {study.studyType ?? study.originalFilename}
          </h2>
          <p className="mt-1 font-body text-sm text-[#707a6c]">
            {formatDate(study.studyDate)} · {study.laboratory ?? 'Laboratorio no detectado'}
          </p>
        </div>
      </div>

      {processing && (
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50/80 px-4 py-3">
          <div className="mb-2 flex items-center gap-2 font-body text-sm font-semibold text-amber-900">
            <Loader2 size={16} className="animate-spin" />
            Analizando tu estudio…
          </div>
          <MedicalStudyProcessingStepper status={study.status} explainPending={isBackground} />
          <p className="mt-2 font-body text-xs text-amber-800/80">
            Los parámetros aparecen apenas estén listos. La explicación llega al final.
          </p>
        </div>
      )}

      {abnormal.length > 0 && tab !== 'parametros' && (
        <button
          type="button"
          onClick={() => setTab('parametros')}
          className="w-full rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-left"
        >
          <p className="font-body text-sm font-bold text-amber-900">
            {abnormal.length} parámetro{abnormal.length === 1 ? '' : 's'} fuera de rango
          </p>
          <p className="mt-0.5 font-body text-xs text-amber-800">Tocá para ver el detalle</p>
        </button>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" tone="journal" onClick={() => void openOriginal()}>
          <Eye size={16} className="mr-1 inline" /> Ver original
        </Button>
        <Button type="button" variant="secondary" onClick={() => void handleShare()}>
          <Share2 size={16} className="mr-1 inline" /> Compartir
        </Button>
        <Button type="button" variant="secondary" onClick={() => void handlePrint()}>
          <Printer size={16} className="mr-1 inline" /> Imprimir
        </Button>
      </div>

      {viewerUrl && (
        <div className="overflow-hidden rounded-[1.5rem] bg-[#edefe6]">
          {study.mimeType === 'application/pdf' ? (
            <iframe title="Documento original" src={viewerUrl} className="h-[60vh] w-full" />
          ) : (
            <img src={viewerUrl} alt="Estudio original" className="max-h-[60vh] w-full object-contain" />
          )}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['resumen', 'Resumen'],
          ['parametros', 'Parámetros'],
          ['explicacion', 'Explicación'],
          ['texto', 'Texto OCR'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              'whitespace-nowrap rounded-full px-4 py-2 font-body text-sm font-semibold transition-colors',
              tab === key ? 'bg-[#226046] text-[#f8faf1]' : 'bg-[#edefe6] text-[#5a6258]',
            )}
          >
            {label}
            {key === 'parametros' && abnormal.length > 0 && (
              <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950">
                {abnormal.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'resumen' && (
        <div className="space-y-4 rounded-[2rem] bg-[#f3f5eb] p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Tipo" value={study.studyType ?? '—'} />
            <InfoRow label="Fecha" value={formatDate(study.studyDate)} />
            <InfoRow label="Laboratorio" value={study.laboratory ?? '—'} />
            <InfoRow label="Parámetros" value={String(study.parameters.length)} />
          </div>
          {study.structuredData?.observations && (
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#707a6c]">Observaciones</p>
              <p className="mt-1 font-body text-sm leading-relaxed text-[#40493d]">{study.structuredData.observations}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'parametros' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-[#707a6c]">{study.parameters.length} parámetros detectados</p>
            <Button type="button" variant="ghost" onClick={() => setShowTimeline((v) => !v)}>
              <TrendingUp size={16} className="mr-1 inline" />
              {showTimeline ? 'Ocultar evolución' : 'Ver evolución'}
            </Button>
          </div>

          {showTimeline && (
            <div className="rounded-[1.5rem] bg-[#edefe6] p-4">
              <p className="mb-3 font-body text-sm font-semibold text-[#191c17]">Comparar parámetro</p>
              <div className="flex flex-wrap gap-2">
                {uniqueParameterKeys.map(([key, name]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => void loadParameterTimeline(key)}
                    className={clsx(
                      'rounded-full px-3 py-1.5 font-body text-xs font-semibold',
                      timelineKey === key ? 'bg-[#226046] text-white' : 'bg-white text-[#226046]',
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
              {timelineKey && parameterTimeline.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {parameterTimeline.map((point, idx) => (
                    <li key={`${point.studyId}-${idx}`} className="rounded-xl bg-white px-3 py-2 font-body text-sm">
                      <span className="font-semibold text-[#191c17]">
                        {formatDate(point.studyDate ?? point.recordedAt)}
                      </span>
                      {' · '}
                      <span>{point.valueText ?? point.valueNumeric ?? '—'}</span>
                      {point.unit ? ` ${point.unit}` : ''}
                      {point.referenceRange ? ` (ref: ${point.referenceRange})` : ''}
                    </li>
                  ))}
                </ul>
              )}
              {timelineKey && parameterTimeline.length === 0 && (
                <p className="mt-3 font-body text-sm text-[#707a6c]">Solo hay un registro de este parámetro.</p>
              )}
            </div>
          )}

          <MedicalStudyParameterGrid parameters={study.parameters} />
        </div>
      )}

      {tab === 'explicacion' && (
        <div className="rounded-[2rem] bg-white p-6 shadow-[0px_8px_24px_rgba(25,28,23,0.04)]">
          {study.patientExplanation ? (
            <MedicalStudyExplanation text={study.patientExplanation} />
          ) : processing ? (
            <div className="flex items-center gap-3 font-body text-sm text-[#707a6c]">
              <Loader2 size={18} className="animate-spin text-[#226046]" />
              Generando explicación en segundo plano…
            </div>
          ) : (
            <p className="font-body text-sm text-[#707a6c]">Todavía no hay explicación generada.</p>
          )}
        </div>
      )}

      {tab === 'texto' && (
        <div className="rounded-[2rem] bg-[#edefe6] p-5">
          <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wide text-[#707a6c]">
            Texto extraído · {study.extractionMethod === 'pdf_text' ? 'PDF nativo' : 'OCR'}
          </p>
          {study.extractedText ? (
            <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap font-body text-xs leading-relaxed text-[#40493d]">
              {study.extractedText}
            </pre>
          ) : processing ? (
            <p className="font-body text-sm text-[#707a6c]">Extrayendo texto del documento…</p>
          ) : (
            <p className="font-body text-sm text-[#707a6c]">Sin texto extraído.</p>
          )}
        </div>
      )}

      <div className="rounded-[1.5rem] border border-dashed border-[#d8ddd0] p-4">
        <p className="mb-3 font-body text-sm font-semibold text-[#191c17]">Reprocesar etapas</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => void handleReprocess(['extract', 'structure', 'explain'])}>
            <RefreshCw size={14} className="mr-1 inline" /> Todo
          </Button>
          <Button type="button" variant="ghost" onClick={() => void handleReprocess(['structure', 'explain'])}>
            Estructura + explicación
          </Button>
          <Button type="button" variant="ghost" onClick={() => void handleReprocess(['explain'])}>
            Solo explicación
          </Button>
        </div>
      </div>

      <Button type="button" variant="ghost" onClick={() => void handleDelete()} className="text-red-600">
        <Trash2 size={16} className="mr-1 inline" /> Eliminar estudio
      </Button>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#707a6c]">{label}</p>
      <p className="mt-0.5 font-body text-sm font-medium text-[#191c17]">{value}</p>
    </div>
  );
}
