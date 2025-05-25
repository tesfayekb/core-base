
import { useEffect, useState } from 'react';
import { implementationStateManager } from '../services/implementation/ImplementationStateManager';
import { aiIntegrationGuard } from '../services/implementation/AIIntegrationGuard';

export const useImplementationStateInitialization = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [enforcementStatus, setEnforcementStatus] = useState(
    aiIntegrationGuard.getEnforcementStatus()
  );

  useEffect(() => {
    // Initialize the implementation state management system
    const initialize = async () => {
      try {
        // The singleton pattern ensures initialization happens automatically
        // when ImplementationStateManager.getInstance() is called
        
        // Log current status for visibility
        const progress = implementationStateManager.getAllProgress();
        const report = aiIntegrationGuard.generatePreventionReport();
        
        console.log('🚀 IMPLEMENTATION STATE SYSTEM INITIALIZED');
        console.log(report);
        
        // Update enforcement status
        setEnforcementStatus(aiIntegrationGuard.getEnforcementStatus());
        setIsInitialized(true);
        
        // Set up periodic enforcement status updates
        const interval = setInterval(() => {
          setEnforcementStatus(aiIntegrationGuard.getEnforcementStatus());
        }, 10000); // Update every 10 seconds
        
        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to initialize implementation state system:', error);
      }
    };

    initialize();
  }, []);

  return {
    isInitialized,
    enforcementStatus,
    generateReport: () => aiIntegrationGuard.generatePreventionReport()
  };
};
