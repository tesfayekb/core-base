
// Implementation State Types for AI Context System
// Phase 1.5: AI Context Management

export interface PhaseCompletionStatus {
  phase: number;
  name: string;
  completed: boolean;
  completionPercentage: number;
  completedFeatures: string[];
  pendingFeatures: string[];
  validationStatus: ValidationStatus;
  lastUpdated: string;
}

// Add PhaseState as an alias for backward compatibility
export interface PhaseState {
  phase: number;
  name: string;
  completedFeatures: string[];
  pendingFeatures: string[];
  validationStatus: ValidationStatus;
}

export interface ValidationStatus {
  passed: boolean;
  errors: string[];
  warnings: string[];
  score?: number; // 0-100
}

export interface ImplementationState {
  phases: PhaseState[];
  overallCompletion: number;
  currentPhase: number;
  blockers: string[];
  recommendations: string[];
  lastScanned: string;
}

export interface FeatureDefinition {
  name: string;
  phase: number;
  requiredFiles: string[];
  requiredFunctions: string[];
  requiredComponents: string[];
  dependencies: string[];
  validationCriteria: string[];
}

export interface AIContextData {
  implementationState: ImplementationState;
  currentCapabilities: string[];
  completedFeatures: string[];
  activeValidations: string[];
  suggestions: string[];
}

export interface ScanResult {
  success: boolean;
  filesScanned: number;
  featuresDetected: string[];
  errors: string[];
  warnings: string[];
  timestamp: string;
}
