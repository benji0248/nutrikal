import { useCallback, useState } from 'react';
import type { AppTab } from '../types';

const APP_TAB_STORAGE_KEY = 'nutrikal_active_tab';
const DEFAULT_TAB: AppTab = 'assistant';

const VALID_TABS: AppTab[] = ['calendar', 'historial', 'assistant', 'shopping', 'settings'];

function readPersistedAppTab(): AppTab {
  try {
    const raw = localStorage.getItem(APP_TAB_STORAGE_KEY);
    if (raw && VALID_TABS.includes(raw as AppTab)) {
      return raw as AppTab;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TAB;
}

export function usePersistedAppTab() {
  const [activeTab, setActiveTabState] = useState<AppTab>(readPersistedAppTab);

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem(APP_TAB_STORAGE_KEY, tab);
    } catch {
      /* ignore */
    }
  }, []);

  return { activeTab, setActiveTab };
}
