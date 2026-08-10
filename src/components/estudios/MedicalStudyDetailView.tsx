import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Share2,
  Printer,
  Eye,
  Trash2,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { useMedicalStudiesStore } from '../../store/useMedicalStudiesStore';
import { getMedicalStudyFileUrl } from '../../services/apiService';
import type { MedicalParameterFlag } from '../../types';

interface MedicalStudyDetailViewProps {
  studyId: string;
  onBack: () => void;
}

type DetailTab = 'resumen' | 'parametros' | 'explicacion' | 'texto';

const FLAG_LABELS: Record<MedicalParameterFlag, string> = {
  normal: 'Normal',
  high: 'Alto',
  low: 'Bajo',
  critical: 'Crítico',
  unknown: '—',
};

const FLAG_TONE: Record<MedicalParameterFlag, string> = {
  normal: 'bg-[#226046]/10 text-[#226046]',
  high: 'bg-amber-100 text-amber-800',
  low: 'bg-sky-100 text-sky-800',
  critical: 'bg-red-100 text-red-800',
  unknown: 'bg-[#edefe6] text-[#707a6c]',
};

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
  const loading = useMedicalStudiesStore((s) => s.loading);

  const [tab, setTab] = useState<DetailTab>('resumen');
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  useEffect(() => {
    void loadStudy(studyId);
  }, [studyId, loadStudy]);

  const study = selectedStudy?.id === studyId ? selectedStudy : null;

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
        // fallback to open
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

  const uniqueParameterKeys = useMemo(() => {
    if (!study) return [];
    const keys = new Map<string, string>();
    for (const p of study.parameters) {
      keys.set(p.parameterKey, p.parameterName);
    }
    return [...keys.entries()];
  }, [study]);

  if (!study && loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center font-body text-[#707a6c]">
        Cargando estudio...
      </div>
    );
  }

  if (!study) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft size={18} className="mr-2 inline" /> Volver
        </Button>
        <p className="font-body text-[#707a6c]">No se pudo cargar el estudio.</p>
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
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowTimeline((v) => !v)}
            >
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

          {study.parameters.map((param) => (
            <div key={param.id} className="rounded-[1.25rem] bg-[#f3f5eb] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-body font-semibold text-[#191c17]">{param.parameterName}</p>
                  {param.section && (
                    <p className="font-body text-xs text-[#707a6c]">{param.section}</p>
                  )}
                </div>
                {param.flag && (
                  <span className={clsx('rounded-full px-2.5 py-0.5 text-xs font-semibold', FLAG_TONE[param.flag])}>
                    {FLAG_LABELS[param.flag]}
                  </span>
                )}
              </div>
              <p className="mt-2 font-heading text-xl font-bold text-[#226046]">
                {param.valueText ?? param.valueNumeric ?? '—'}
                {param.unit ? <span className="ml-1 text-sm font-medium text-[#707a6c]">{param.unit}</span> : null}
              </p>
              {param.referenceRange && (
                <p className="mt-1 font-body text-xs text-[#707a6c]">Referencia: {param.referenceRange}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'explicacion' && (
        <div className="rounded-[2rem] bg-[#f3f5eb] p-5">
          {study.patientExplanation ? (
            <p className="whitespace-pre-line font-body text-sm leading-relaxed text-[#40493d]">
              {study.patientExplanation}
            </p>
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
          <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap font-body text-xs leading-relaxed text-[#40493d]">
            {study.extractedText ?? 'Sin texto extraído.'}
          </pre>
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
