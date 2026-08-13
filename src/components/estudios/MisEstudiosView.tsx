import { useEffect, useState } from 'react';
import { Plus, FileText, ChevronRight, AlertCircle, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui/Button';
import { BottomSheet } from '../ui/BottomSheet';
import { Modal } from '../ui/Modal';
import { MedicalStudyUploadFlow } from './MedicalStudyUploadFlow';
import { MedicalStudyDetailView } from './MedicalStudyDetailView';
import { MedicalStudyProcessingStepper } from './MedicalStudyProcessingStepper';
import { useMedicalStudiesStore } from '../../store/useMedicalStudiesStore';
import { isProcessingStatus } from '../../utils/medicalStudyHelpers';
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

function statusLabel(study: MedicalStudySummary, isBackground: boolean) {
  if (isBackground || isProcessingStatus(study.status)) return 'Analizando';
  switch (study.status) {
    case 'completed':
      return 'Listo';
    case 'failed':
      return 'Error';
    default:
      return 'Subido';
  }
}

export function MisEstudiosView() {
  const studies = useMedicalStudiesStore((s) => s.studies);
  const backgroundJobs = useMedicalStudiesStore((s) => s.backgroundJobs);
  const loadStudies = useMedicalStudiesStore((s) => s.loadStudies);
  const deleteStudy = useMedicalStudiesStore((s) => s.deleteStudy);
  const clearSelected = useMedicalStudiesStore((s) => s.clearSelected);
  const error = useMedicalStudiesStore((s) => s.error);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const hasProcessing = studies.some(
      (s) => isProcessingStatus(s.status) || backgroundJobs[s.id],
    );
    if (!hasProcessing) return undefined;
    const timer = setInterval(() => {
      void loadStudies();
    }, 4000);
    return () => clearInterval(timer);
  }, [studies, backgroundJobs, loadStudies]);

  const handleDeleteFromList = async (study: MedicalStudySummary) => {
    const label = study.studyType ?? study.originalFilename;
    if (!confirm(`¿Eliminar "${label}"? Se borrará el archivo y todos los datos.`)) return;

    setDeletingId(study.id);
    await deleteStudy(study.id);
    setDeletingId(null);
  };

  if (selectedId) {
    return (
      <MedicalStudyDetailView
        studyId={selectedId}
        onBack={() => {
          setSelectedId(null);
          clearSelected();
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

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 font-body text-sm text-red-700">{error}</p>
      )}

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
          {studies.map((study) => {
            const isBackground = !!backgroundJobs[study.id];
            const processing = isBackground || isProcessingStatus(study.status);
            const isDeleting = deletingId === study.id;

            return (
              <li key={study.id}>
                <div className="flex items-stretch gap-1">
                  <button
                    type="button"
                    onClick={() => setSelectedId(study.id)}
                    className="flex min-w-0 flex-1 flex-col gap-3 rounded-[1.5rem] bg-[#f3f5eb] px-4 py-4 text-left transition-colors hover:bg-[#edefe6] active:bg-[#e7e9e0]"
                  >
                    <div className="flex items-center gap-4">
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
                          {study.parameterCount > 0
                            ? `${study.parameterCount} parámetros`
                            : processing
                              ? 'Procesando resultados…'
                              : 'Sin parámetros aún'}
                        </p>
                      </div>
                      <div className="flex flex-shrink-0 flex-col items-end gap-1">
                        <span
                          className={clsx(
                            'rounded-full px-2.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wide',
                            study.status === 'completed' && !processing && 'bg-[#226046]/10 text-[#226046]',
                            study.status === 'failed' && 'bg-red-100 text-red-700',
                            processing && 'bg-amber-100 text-amber-800',
                            !processing && study.status !== 'completed' && study.status !== 'failed' && 'bg-[#edefe6] text-[#707a6c]',
                          )}
                        >
                          {statusLabel(study, isBackground)}
                        </span>
                        {study.status === 'failed' && (
                          <AlertCircle size={16} className="text-red-500" aria-label="Error de procesamiento" />
                        )}
                        <ChevronRight size={18} className="text-[#707a6c]" />
                      </div>
                    </div>
                    {processing && (
                      <MedicalStudyProcessingStepper status={study.status} compact explainPending={isBackground} />
                    )}
                  </button>

                  <button
                    type="button"
                    aria-label={`Eliminar ${study.studyType ?? study.originalFilename}`}
                    disabled={isDeleting}
                    onClick={() => void handleDeleteFromList(study)}
                    className="flex w-12 shrink-0 items-center justify-center rounded-[1.5rem] bg-[#f3f5eb] text-red-500 transition-colors hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <BottomSheet isOpen={showUpload} onClose={() => setShowUpload(false)} title="Nuevo estudio" tone="journal">
        <MedicalStudyUploadFlow
          onUploaded={() => setShowUpload(false)}
          onCancel={() => setShowUpload(false)}
        />
      </BottomSheet>

      <Modal isOpen={showUpload} onClose={() => setShowUpload(false)} title="Nuevo estudio" tone="journal">
        <MedicalStudyUploadFlow
          onUploaded={() => setShowUpload(false)}
          onCancel={() => setShowUpload(false)}
        />
      </Modal>
    </div>
  );
}
