import { useState } from 'react';
import { Plus, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MedicalStudyUploadFlow } from './MedicalStudyUploadFlow';
import { MedicalStudyDetailView } from './MedicalStudyDetailView';
import { useMedicalStudiesStore } from '../../store/useMedicalStudiesStore';
import type { MedicalStudySummary } from '../../types';

function formatStudyDate(value?: string) {
  if (!value) return null;
  try {
    return new Date(value.includes('T') ? value : `${value}T12:00:00`).toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function statusLabel(status: MedicalStudySummary['status']) {
  switch (status) {
    case 'completed':
      return 'Listo';
    case 'failed':
      return 'Error';
    case 'uploaded':
      return 'Subido';
    default:
      return 'Procesando';
  }
}

export function MisEstudiosView() {
  const studies = useMedicalStudiesStore((s) => s.studies);
  const loadStudies = useMedicalStudiesStore((s) => s.loadStudies);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <MedicalStudyDetailView
        studyId={selectedId}
        onBack={() => {
          setSelectedId(null);
          void loadStudies();
        }}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 pb-28 md:pb-8">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-bold text-[#191c17]">Mis estudios</h1>
        <p className="font-body text-sm leading-relaxed text-[#707a6c]">
          Tu historial médico personal. Subí laboratorios e informes; NutriKal extrae, estructura y explica los resultados.
        </p>
      </header>

      <Button type="button" tone="journal" fullWidth onClick={() => setShowUpload(true)}>
        <Plus size={18} className="mr-2 inline" />
        Subir estudio
      </Button>

      {studies.length === 0 ? (
        <div className="rounded-[2rem] bg-[#f3f5eb] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#226046]/10 text-[#226046]">
            <FileText size={26} />
          </div>
          <p className="font-body text-sm text-[#707a6c]">
            Todavía no subiste estudios. Cuando lo hagas, van a quedar guardados acá con su documento original.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {studies.map((study) => (
            <li key={study.id}>
              <button
                type="button"
                onClick={() => setSelectedId(study.id)}
                className="flex w-full items-center gap-4 rounded-[1.5rem] bg-[#f3f5eb] px-4 py-4 text-left transition-colors hover:bg-[#edefe6]"
              >
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#226046]/10 text-[#226046]">
                  <FileText size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body font-semibold text-[#191c17]">
                    {study.studyType ?? study.originalFilename}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-[#707a6c]">
                    {formatStudyDate(study.studyDate) ?? 'Sin fecha'} · {study.laboratory ?? study.originalFilename}
                  </p>
                  <p className="mt-1 font-body text-xs text-[#707a6c]">
                    {study.parameterCount} parámetros
                  </p>
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1">
                  <span
                    className={clsx(
                      'rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide',
                      study.status === 'completed' && 'bg-[#226046]/10 text-[#226046]',
                      study.status === 'failed' && 'bg-red-100 text-red-700',
                      study.status !== 'completed' && study.status !== 'failed' && 'bg-amber-100 text-amber-800',
                    )}
                  >
                    {statusLabel(study.status)}
                  </span>
                  {study.status === 'failed' && (
                    <AlertCircle size={16} className="text-red-500" aria-label="Error de procesamiento" />
                  )}
                  <ChevronRight size={18} className="text-[#707a6c]" />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <BottomSheet isOpen={showUpload} onClose={() => setShowUpload(false)} title="Nuevo estudio" tone="journal">
        <MedicalStudyUploadFlow
          onComplete={(id) => {
            setShowUpload(false);
            setSelectedId(id);
          }}
          onCancel={() => setShowUpload(false)}
        />
      </BottomSheet>

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Nuevo estudio" tone="journal">
        <MedicalStudyUploadFlow
          onComplete={(id) => {
            setShowUpload(false);
            setSelectedId(id);
          }}
          onCancel={() => setShowUpload(false)}
        />
      </Modal>
    </div>
  );
}
