
// AI Context Hook
// Phase 1.5: AI Context System - React hook for AI context management

import { useState, useEffect, useCallback } from 'react';
import { AIContextData } from '@/types/ImplementationState';
import { aiContextService } from '@/services/AIContextService';

export function useAIContext() {
  const [contextData, setContextData] = useState<AIContextData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshContext = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 Refreshing AI context...');
      
      const context = await aiContextService.generateAIContext();
      setContextData(context);
      setLastUpdated(new Date());
      
      console.log('✅ AI context refreshed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Failed to refresh AI context:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const invalidateContext = useCallback(async () => {
    await aiContextService.invalidateCache();
    await refreshContext();
  }, [refreshContext]);

  const getContextSummary = useCallback((): string => {
    return aiContextService.generateContextSummary();
  }, []);

  // Initialize context on mount
  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  // Auto-refresh context every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Auto-refreshing AI context...');
      refreshContext();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [refreshContext]);

  return {
    contextData,
    isLoading,
    error,
    lastUpdated,
    refreshContext,
    invalidateContext,
    getContextSummary,
    
    // Computed properties for easy access
    overallCompletion: contextData?.implementationState.overallCompletion || 0,
    currentPhase: contextData?.implementationState.currentPhase || 1,
    completedFeatures: contextData?.completedFeatures || [],
    currentCapabilities: contextData?.currentCapabilities || [],
    blockers: contextData?.implementationState.blockers || [],
    recommendations: contextData?.implementationState.recommendations || []
  };
}
