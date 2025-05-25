
// AI Context Hook
// Phase 1.5: AI Context System - React hook for AI context management

import { useState, useEffect, useCallback } from 'react';
import { AIContextData } from '@/types/ImplementationState';
import { aiContextService } from '@/services/AIContextService';

export function useAIContext() {
  const [contextData, setContextData] = useState<AIContextData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshContext = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 useAIContext: Starting context refresh...');
      
      // Check for cached data first
      const cachedContext = aiContextService.getCachedContext();
      if (cachedContext) {
        console.log('📦 useAIContext: Using cached context data');
        setContextData(cachedContext);
        setLastUpdated(new Date());
        setIsLoading(false);
        return;
      }
      
      const context = await aiContextService.generateAIContext();
      console.log('✅ useAIContext: Context generated successfully:', context);
      
      // Ensure we have the context data before setting state
      if (context) {
        setContextData(context);
        setLastUpdated(new Date());
      } else {
        throw new Error('No context data returned from service');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ useAIContext: Failed to refresh context:', errorMessage, err);
      setError(errorMessage);
      setContextData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const invalidateContext = useCallback(async () => {
    console.log('🗑️ useAIContext: Invalidating context cache...');
    await aiContextService.invalidateCache();
    await refreshContext();
  }, [refreshContext]);

  const getContextSummary = useCallback((): string => {
    return aiContextService.generateContextSummary();
  }, []);

  // Initialize context on mount
  useEffect(() => {
    console.log('🚀 useAIContext: Hook initialized, starting refresh...');
    refreshContext();
  }, [refreshContext]);

  // Auto-refresh context every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ useAIContext: Auto-refreshing context...');
      refreshContext();
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [refreshContext]);

  // Debug logging
  useEffect(() => {
    console.log('🔍 useAIContext state:', { contextData, isLoading, error });
  }, [contextData, isLoading, error]);

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
