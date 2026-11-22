import React from 'react';
import { MergedRegistry } from '../utils/packRegistry';

export const RegistryContext = React.createContext<MergedRegistry | null>(null);

export function useRegistry(): MergedRegistry {
  const ctx = React.useContext(RegistryContext);
  if (!ctx) {
    throw new Error('useRegistry must be used inside RegistryContext.Provider');
  }
  return ctx;
}
