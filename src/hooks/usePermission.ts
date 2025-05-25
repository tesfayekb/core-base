
// Permission Hook
// RBAC permission checking hook

import { useState, useEffect } from 'react';

export function usePermission(action: string, resource: string, resourceId?: string) {
  const [hasPermission, setHasPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Mock permission check - in real implementation this would check against RBAC system
        // For AI Context dashboard, we'll allow access for demonstration
        const allowedResources = ['ai_context', 'dashboard', 'users'];
        const allowedActions = ['View', 'ViewSecurity', 'Debug'];
        
        const permitted = allowedResources.includes(resource) && allowedActions.includes(action);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 100));
        
        setHasPermission(permitted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Permission check failed');
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermission();
  }, [action, resource, resourceId]);

  return { hasPermission, isLoading, error };
}
