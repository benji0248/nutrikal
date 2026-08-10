import { useRef, useState } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { MedicalStudyLoader } from './MedicalStudyLoader';
import { useMedicalStudiesStore } from '../../store/useMedicalStudiesStore';
import type { MedicalStudyProcessingStage } from '../../types';

interface MedicalStudyUploadFlowProps {
  onComplete: (studyId: string) => void;
  onCancel: () => void;
}

export function MedicalStudyUploadFlow({ onComplete, onCancel }: MedicalStudyUploadFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAndProcess = useMedicalStudiesStore((s) => s.uploadAndProcess);
  const error = useMedicalStudiesStore((s) => s.error);
  const loading = useMedicalStudiesStore((s) => s.loading);
  const [currentStage, setCurrentStage] = useState<'idle' | MedicalStudyProcessingStage>('idle');

  const handleFile = async (file: File) => {
    setCurrentStage('upload');
    const study = await uploadAndProcess(file, (nextStage) => {
      setCurrentStage(nextStage as MedicalStudyProcessingStage);
    });

    if (study) {
      onComplete(study.id);
    } else {
      setCurrentStage('idle');
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  if (loading && currentStage !== 'idle') {
    return <MedicalStudyLoader stage={currentStage} />;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-[#f3f5eb] p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#226046]/10 text-[#226046]">
          <FileText size={26} />
        </div>
        <h3 className="font-heading text-xl font-bold text-[#191c17]">Subir estudio médico</h3>
        <p className="mt-2 font-body text-sm leading-relaxed text-[#707a6c]">
          PDF o imagen (JPG, PNG, WebP). Guardamos el original y analizamos los resultados con IA.
        </p>
        <p className="mt-3 font-body text-xs text-[#707a6c]">
          La explicación es orientativa y no reemplaza la consulta con un profesional de salud.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 font-body text-sm text-red-700">{error}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={onFileSelect}
      />

      <Button type="button" tone="journal" fullWidth onClick={() => inputRef.current?.click()}>
        <Upload size={18} className="mr-2 inline" />
        Elegir archivo
      </Button>

      <Button type="button" variant="ghost" fullWidth onClick={onCancel}>
        Cancelar
      </Button>
    </div>
  );
}
