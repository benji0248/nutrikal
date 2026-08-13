import { create } from 'zustand';
import type {
  MedicalStudyDetail,
  MedicalStudySummary,
  ParameterTimelinePoint,
} from '../types';
import * as api from '../services/apiService';
import { summaryFromDetail } from '../utils/medicalStudyHelpers';

export type BackgroundStage = 'extract' | 'structure' | 'explain' | null;

interface MedicalStudiesState {
  studies: MedicalStudySummary[];
  selectedStudy: MedicalStudyDetail | null;
  parameterTimeline: ParameterTimelinePoint[];
  timelineKey: string | null;
  loading: boolean;
  error: string | null;
  /** Estudios procesándose en background (id → etapa actual) */
  backgroundJobs: Record<string, BackgroundStage>;

  hydrateStudies: (studies: MedicalStudySummary[]) => void;
  loadStudies: () => Promise<void>;
  loadStudy: (id: string) => Promise<MedicalStudyDetail | null>;
  uploadStudy: (file: File) => Promise<MedicalStudySummary | null>;
  processStudyInBackground: (id: string) => Promise<void>;
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

function applyDetail(state: MedicalStudiesState, study: MedicalStudyDetail): Partial<MedicalStudiesState> {
  return {
    studies: upsertSummary(state.studies, summaryFromDetail(study)),
    selectedStudy: state.selectedStudy?.id === study.id ? study : state.selectedStudy,
  };
}

export const useMedicalStudiesStore = create<MedicalStudiesState>((set) => ({
  studies: [],
  selectedStudy: null,
  parameterTimeline: [],
  timelineKey: null,
  loading: false,
  error: null,
  backgroundJobs: {},

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
        ...applyDetail(state, study),
        selectedStudy: study,
        loading: false,
      }));
      return study;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Error al cargar estudio',
        selectedStudy: null,
      });
      return null;
    }
  },

  uploadStudy: async (file) => {
    set({ error: null });
    try {
      const study = await api.uploadMedicalStudy(file);
      const summary = summaryFromDetail(study);
      set((state) => ({
        studies: upsertSummary(state.studies, summary),
        backgroundJobs: { ...state.backgroundJobs, [study.id]: 'extract' },
      }));
      return summary;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Error al subir estudio' });
      return null;
    }
  },

  processStudyInBackground: async (id) => {
    const setStage = (stage: BackgroundStage) =>
      set((state) => ({
        backgroundJobs: stage
          ? { ...state.backgroundJobs, [id]: stage }
          : Object.fromEntries(Object.entries(state.backgroundJobs).filter(([k]) => k !== id)),
      }));

    try {
      setStage('extract');
      let study = await api.extractMedicalStudy(id);
      set((state) => applyDetail(state, study));

      setStage('structure');
      study = await api.structureMedicalStudy(id);
      set((state) => applyDetail(state, study));

      // Explicación en background — el usuario ya puede ver parámetros
      setStage('explain');
      study = await api.explainMedicalStudy(id);
      set((state) => applyDetail(state, study));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al procesar estudio';
      set({ error: message });
      try {
        const study = await api.getMedicalStudy(id);
        set((state) => applyDetail(state, study));
      } catch {
        /* ignore refresh error */
      }
    } finally {
      setStage(null);
    }
  },

  deleteStudy: async (id) => {
    try {
      await api.deleteMedicalStudy(id);
      set((state) => ({
        studies: state.studies.filter((s) => s.id !== id),
        selectedStudy: state.selectedStudy?.id === id ? null : state.selectedStudy,
        backgroundJobs: Object.fromEntries(
          Object.entries(state.backgroundJobs).filter(([k]) => k !== id),
        ),
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
        ...applyDetail(state, study),
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
