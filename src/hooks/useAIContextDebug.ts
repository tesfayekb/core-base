
import { useState, useEffect, useCallback } from 'react';
import { aiContextDebugger, DebugSession } from '@/services/AIContextDebugger';
import { aiContextService } from '@/services/AIContextService';

export const useAIContextDebug = () => {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  const refreshData = useCallback(() => {
    setSessions(aiContextDebugger.getDebugSessions());
    setOverrides(aiContextDebugger.getOverrides());
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const startDebugging = useCallback(() => {
    aiContextDebugger.startDebugging();
    setIsDebugging(true);
  }, []);

  const stopDebugging = useCallback(() => {
    aiContextDebugger.stopDebugging();
    setIsDebugging(false);
  }, []);

  const captureSession = useCallback(async () => {
    await aiContextDebugger.captureDebugSession();
    refreshData();
  }, [refreshData]);

  const addOverride = useCallback((key: string, value: any) => {
    aiContextDebugger.setOverride(key, value);
    refreshData();
  }, [refreshData]);

  const removeOverride = useCallback((key: string) => {
    aiContextDebugger.removeOverride(key);
    refreshData();
  }, [refreshData]);

  const clearAllOverrides = useCallback(() => {
    aiContextDebugger.clearOverrides();
    refreshData();
  }, [refreshData]);

  const generateContextWithOverrides = useCallback(async () => {
    // Apply overrides temporarily
    const originalContext = await aiContextService.generateAIContext();
    
    // Apply user overrides to the context
    const modifiedContext = { ...originalContext };
    Object.entries(overrides).forEach(([key, value]) => {
      if (key.includes('.')) {
        // Handle nested properties
        const keys = key.split('.');
        let target = modifiedContext as any;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]]) target[keys[i]] = {};
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
      } else {
        (modifiedContext as any)[key] = value;
      }
    });

    return modifiedContext;
  }, [overrides]);

  const exportDebugData = useCallback(() => {
    const data = aiContextDebugger.exportDebugData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-context-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return aiContextDebugger.getPerformanceMetrics();
  }, []);

  return {
    sessions,
    isDebugging,
    overrides,
    startDebugging,
    stopDebugging,
    captureSession,
    addOverride,
    removeOverride,
    clearAllOverrides,
    generateContextWithOverrides,
    exportDebugData,
    getPerformanceMetrics,
    refreshData
  };
};
