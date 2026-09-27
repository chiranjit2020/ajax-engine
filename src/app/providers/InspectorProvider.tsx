import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { readStored, writeStored } from '../../utils/storage';

/**
 * UI-only state for the inspectors: which bottom-panel tab, network section,
 * and code file are showing. Request data itself always comes from the
 * simulation state, never from here.
 */
export type PanelTab = 'timeline' | 'code' | 'network' | 'console';
export type NetworkSection = 'overview' | 'request' | 'response';

interface InspectorContextValue {
  panelTab: PanelTab;
  networkSection: NetworkSection;
  codeFileId: string | null;
  panelOpen: boolean;
  setPanelTab(tab: PanelTab): void;
  setNetworkSection(section: NetworkSection): void;
  setCodeFileId(id: string): void;
  setPanelOpen(open: boolean): void;
  /** Open the bottom panel at a tab (and network section), e.g. when a packet is clicked. */
  reveal(tab: PanelTab, section?: NetworkSection): void;
}

const InspectorContext = createContext<InspectorContextValue | null>(null);

export function InspectorProvider({ children }: { children: ReactNode }) {
  const [panelTab, setPanelTab] = useState<PanelTab>('code');
  const [networkSection, setNetworkSection] = useState<NetworkSection>('overview');
  const [codeFileId, setCodeFileId] = useState<string | null>(null);
  const [panelOpen, setPanelOpenState] = useState(() => readStored('panel-open') !== 'false');

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelOpenState(open);
    writeStored('panel-open', String(open));
  }, []);

  const value = useMemo<InspectorContextValue>(
    () => ({
      panelTab,
      networkSection,
      codeFileId,
      panelOpen,
      setPanelTab,
      setNetworkSection,
      setCodeFileId,
      setPanelOpen,
      reveal(tab, section) {
        setPanelTab(tab);
        if (section) setNetworkSection(section);
        setPanelOpen(true);
      },
    }),
    [panelTab, networkSection, codeFileId, panelOpen, setPanelOpen],
  );

  return <InspectorContext.Provider value={value}>{children}</InspectorContext.Provider>;
}

export function useInspector(): InspectorContextValue {
  const context = useContext(InspectorContext);
  if (!context) throw new Error('useInspector must be used inside InspectorProvider');
  return context;
}
