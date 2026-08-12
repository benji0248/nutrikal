import { useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { Button } from '../ui/Button';
import { useMedicalStudiesStore } from '../../store/useMedicalStudiesStore';

interface MedicalStudyUploadFlowProps {
  onUploaded: (studyId: string) => void;
  onCancel: () => void;
}

export function MedicalStudyUploadFlow({ onUploaded, onCancel }: MedicalStudyUploadFlowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadStudy = useMedicalStudiesStore((s) => s.uploadStudy);
  const processStudyInBackground = useMedicalStudiesStore((s) => s.processStudyInBackground);
  const error = useMedicalStudiesStore((s) => s.error);

  const handleFile = async (file: File) => {
    const summary = await uploadStudy(file);
    if (!summary) return;

    onUploaded(summary.id);
    void processStudyInBackground(summary.id);
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-[#f3f5eb] p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#226046]/10 text-[#226046]">
          <FileText size={26} />
        </div>
        <h3 className="font-heading text-xl font-bold text-[#191c17]">Subir estudio médico</h3>
        <p className="mt-2 font-body text-sm leading-relaxed text-[#707a6c]">
          PDF o imagen (JPG, PNG, WebP). Guardamos el original y analizamos en segundo plano.
        </p>
        <p className="mt-3 font-body text-xs text-[#707a6c]">
          El análisis puede tardar 1–2 minutos. Podés seguir usando la app mientras procesamos.
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
