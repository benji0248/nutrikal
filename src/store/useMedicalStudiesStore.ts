import { create } from 'zustand';
import type {
  MedicalStudyDetail,
  MedicalStudySummary,
  ParameterTimelinePoint,
} from '../types';
import * as api from '../services/medicalStudiesApi';

interface MedicalStudiesState {
  studies: MedicalStudySummary[];
  selectedStudy: MedicalStudyDetail | null;
  parameterTimeline: ParameterTimelinePoint[];
  timelineKey: string | null;
  loading: boolean;
  error: string | null;

  hydrateStudies: (studies: MedicalStudySummary[]) => void;
  loadStudies: () => Promise<void>;
  loadStudy: (id: string) => Promise<MedicalStudyDetail | null>;
  uploadAndProcess: (file: File, onStage?: (stage: string) => void) => Promise<MedicalStudyDetail | null>;
  deleteStudy: (id: string) => Promise<boolean>;
  reprocessStudy: (id: string, stages: Array<'extract' | 'structure' | 'explain'>) => Promise<MedicalStudyDetail | null>;
  loadParameterTimeline: (parameterKey: string) => Promise<void>;
  clearSelected: () => void;
}

function upsertSummary(list: MedicalStudySummary[], study: MedicalStudySummary): MedicalStudySummary[] {
  const idx = list.findIndex((s) => s.id === study.id);
  if (idx === -1) return [study, ...list];
  const next = [...list];
  next[idx] = study;
  return next;
}

function summaryFromDetail(detail: MedicalStudyDetail): MedicalStudySummary {
  return {
    id: detail.id,
    originalFilename: detail.originalFilename,
    mimeType: detail.mimeType,
    fileSizeBytes: detail.fileSizeBytes,
    status: detail.status,
    processingError: detail.processingError,
    studyType: detail.studyType,
    studyDate: detail.studyDate,
    laboratory: detail.laboratory,
    parameterCount: detail.parameterCount,
    createdAt: detail.createdAt,
    updatedAt: detail.updatedAt,
  };
}

export const useMedicalStudiesStore = create<MedicalStudiesState>((set) => ({
  studies: [],
  selectedStudy: null,
  parameterTimeline: [],
  timelineKey: null,
  loading: false,
  error: null,

  hydrateStudies: (studies) => set({ studies }),

  loadStudies: async () => {
    set({ loading: true, error: null });
    try {
      const studies = await api.listMedicalStudies();
      set({ studies, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar estudios',
      });
    }
  },

  loadStudy: async (id) => {
    set({ loading: true, error: null });
    try {
      const study = await api.getMedicalStudy(id);
      set((state) => ({
        selectedStudy: study,
        studies: upsertSummary(state.studies, summaryFromDetail(study)),
        loading: false,
      }));
      return study;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar estudio',
      });
      return null;
    }
  },

  uploadAndProcess: async (file, onStage) => {
    set({ loading: true, error: null });
    try {
      onStage?.('upload');
      let study = await api.uploadMedicalStudy(file);

      onStage?.('extract');
      study = await api.extractMedicalStudy(study.id);

      onStage?.('structure');
      study = await api.structureMedicalStudy(study.id);

      onStage?.('explain');
      study = await api.explainMedicalStudy(study.id);

      set((state) => ({
        studies: upsertSummary(state.studies, summaryFromDetail(study)),
        selectedStudy: study,
        loading: false,
      }));
      return study;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al procesar estudio',
      });
      return null;
    }
  },

  deleteStudy: async (id) => {
    try {
      await api.deleteMedicalStudy(id);
      set((state) => ({
        studies: state.studies.filter((s) => s.id !== id),
        selectedStudy: state.selectedStudy?.id === id ? null : state.selectedStudy,
      }));
      return true;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al eliminar' });
      return false;
    }
  },

  reprocessStudy: async (id, stages) => {
    set({ loading: true, error: null });
    try {
      const study = await api.reprocessMedicalStudy(id, stages);
      set((state) => ({
        studies: upsertSummary(state.studies, summaryFromDetail(study)),
        selectedStudy: study,
        loading: false,
      }));
      return study;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al reprocesar',
      });
      return null;
    }
  },

  loadParameterTimeline: async (parameterKey) => {
    set({ loading: true, error: null });
    try {
      const { points } = await api.getParameterTimeline(parameterKey);
      set({ parameterTimeline: points, timelineKey: parameterKey, loading: false });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar evolución',
      });
    }
  },

  clearSelected: () => set({ selectedStudy: null }),
}));
