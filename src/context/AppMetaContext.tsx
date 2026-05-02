import { createContext, useContext, ReactNode } from 'react';
import { useAppMeta, AppMetaContext as AppMetaContextType } from '../hooks/useAppMeta';

const AppMetaContext = createContext<AppMetaContextType | null>(null);

export function AppMetaProvider({ children }: { children: ReactNode }) {
  const meta = useAppMeta();
  return <AppMetaContext.Provider value={meta}>{children}</AppMetaContext.Provider>;
}

/** Consume the app-level meta context from any child component. */
export function useAppMetaContext(): AppMetaContextType {
  const ctx = useContext(AppMetaContext);
  if (!ctx) throw new Error('useAppMetaContext must be used within AppMetaProvider');
  return ctx;
}
