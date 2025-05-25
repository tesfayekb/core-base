
// AI Context Debug Hook
// Developer tools hook for debugging AI context system

import { useState, useCallback } from 'react';
import { aiContextDebugger, DebugSession } from '@/services/AIContextDebugger';

export function useAIContextDebug() {
  const [sessions, setSessions] = useState<DebugSession[]>([]);
  const [isDebugging, setIsDebugging] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  const startDebugging = useCallback(() => {
    aiContextDebugger.startDebugging();
    setIsDebugging(true);
  }, []);

  const stopDebugging = useCallback(() => {
    aiContextDebugger.stopDebugging();
    setIsDebugging(false);
  }, []);

  const captureSession = useCallback(async () => {
    try {
      const session = await aiContextDebugger.captureDebugSession();
      setSessions(prev => [...prev, session]);
      return session;
    } catch (error) {
      console.error('Failed to capture debug session:', error);
      throw error;
    }
  }, []);

  const exportDebugData = useCallback(() => {
    const data = aiContextDebugger.exportDebugData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-context-debug-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const getPerformanceMetrics = useCallback(() => {
    return aiContextDebugger.getPerformanceMetrics();
  }, []);

  const refreshData = useCallback(() => {
    setSessions(aiContextDebugger.getDebugSessions());
    setOverrides(aiContextDebugger.getOverrides());
  }, []);

  // Initialize data on mount
  useState(() => {
    refreshData();
  });

  return {
    sessions,
    isDebugging,
    overrides,
    startDebugging,
    stopDebugging,
    captureSession,
    exportDebugData,
    getPerformanceMetrics,
    refreshData
  };
}
