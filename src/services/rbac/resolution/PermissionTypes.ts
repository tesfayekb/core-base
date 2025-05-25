
// Permission Resolution Types
export interface PermissionResolutionResult {
  granted: boolean;
  reason: string;
  dependencies: string[];
  resolutionTime: number;
  cacheHit: boolean;
  dependencyChain?: string[];
  missingDependencies?: string[];
}

export interface PermissionContext {
  tenantId?: string;
  entityId?: string;
  resourceId?: string;
  metadata?: Record<string, any>;
}
