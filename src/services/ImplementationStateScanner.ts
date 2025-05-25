
// Implementation State Scanner Service
// Phase 1.5: AI Context System - Scans codebase for completed features

import { PhaseCompletionStatus, ImplementationState, FeatureDefinition, ScanResult } from '@/types/ImplementationState';

class ImplementationStateScannerService {
  private readonly PHASE_DEFINITIONS: Record<number, FeatureDefinition[]> = {
    1: [
      {
        name: 'Authentication System',
        phase: 1,
        requiredFiles: ['src/contexts/AuthContext.tsx', 'src/hooks/useAuth.ts'],
        requiredFunctions: ['signIn', 'signOut', 'signUp'],
        requiredComponents: ['AuthProvider'],
        dependencies: ['@supabase/supabase-js'],
        validationCriteria: ['JWT token management', 'Session persistence']
      },
      {
        name: 'RBAC Foundation',
        phase: 1,
        requiredFiles: ['src/services/rbac/', 'src/hooks/usePermissions.ts'],
        requiredFunctions: ['checkPermission', 'getUserRoles'],
        requiredComponents: ['PermissionGuard'],
        dependencies: [],
        validationCriteria: ['Permission checking', 'Role management']
      },
      {
        name: 'Multi-tenant Foundation',
        phase: 1,
        requiredFiles: ['src/services/tenant/', 'src/hooks/useTenant.ts'],
        requiredFunctions: ['setTenantContext', 'getTenantData'],
        requiredComponents: ['TenantProvider'],
        dependencies: [],
        validationCriteria: ['Tenant isolation', 'Context switching']
      },
      {
        name: 'Database Setup',
        phase: 1,
        requiredFiles: ['src/services/database/', 'src/services/migrations/'],
        requiredFunctions: ['query', 'transaction'],
        requiredComponents: [],
        dependencies: ['@supabase/supabase-js'],
        validationCriteria: ['Connection management', 'Migration system']
      }
    ],
    2: [
      {
        name: 'Advanced RBAC',
        phase: 2,
        requiredFiles: ['src/services/rbac/advancedPermissions.ts'],
        requiredFunctions: ['bulkPermissionCheck', 'permissionCaching'],
        requiredComponents: ['AdvancedPermissionGuard'],
        dependencies: [],
        validationCriteria: ['Permission caching', 'Bulk operations']
      },
      {
        name: 'User Management',
        phase: 2,
        requiredFiles: ['src/services/userManagement/', 'src/pages/Users.tsx'],
        requiredFunctions: ['createUser', 'updateUser', 'deleteUser'],
        requiredComponents: ['UserTable', 'UserForm'],
        dependencies: [],
        validationCriteria: ['CRUD operations', 'User validation']
      }
    ]
  };

  async scanImplementationState(): Promise<ImplementationState> {
    try {
      console.log('🔍 Starting implementation state scan...');
      
      const phases: PhaseCompletionStatus[] = [];
      
      for (const phaseNumber of [1, 2, 3, 4]) {
        const phaseStatus = await this.scanPhase(phaseNumber);
        phases.push(phaseStatus);
      }

      const overallCompletion = this.calculateOverallCompletion(phases);
      const currentPhase = this.determineCurrentPhase(phases);

      const state: ImplementationState = {
        phases,
        overallCompletion,
        currentPhase,
        blockers: this.identifyBlockers(phases),
        recommendations: this.generateRecommendations(phases),
        lastScanned: new Date().toISOString()
      };

      console.log('✅ Implementation scan completed:', {
        overallCompletion: `${overallCompletion}%`,
        currentPhase,
        totalPhases: phases.length
      });

      return state;
    } catch (error) {
      console.error('❌ Implementation scan failed:', error);
      return this.getEmptyState();
    }
  }

  private async scanPhase(phaseNumber: number): Promise<PhaseCompletionStatus> {
    const features = this.PHASE_DEFINITIONS[phaseNumber] || [];
    const completedFeatures: string[] = [];
    const pendingFeatures: string[] = [];

    for (const feature of features) {
      const isCompleted = await this.checkFeatureCompletion(feature);
      if (isCompleted) {
        completedFeatures.push(feature.name);
      } else {
        pendingFeatures.push(feature.name);
      }
    }

    const completionPercentage = features.length > 0 
      ? Math.round((completedFeatures.length / features.length) * 100)
      : 0;

    const validationStatus = await this.validatePhase(phaseNumber, completedFeatures);

    return {
      phase: phaseNumber,
      name: this.getPhaseName(phaseNumber),
      completed: completionPercentage === 100,
      completionPercentage,
      completedFeatures,
      pendingFeatures,
      validationStatus,
      lastUpdated: new Date().toISOString()
    };
  }

  private async checkFeatureCompletion(feature: FeatureDefinition): Promise<boolean> {
    try {
      // Check required files exist
      for (const filePath of feature.requiredFiles) {
        if (!await this.fileExists(filePath)) {
          return false;
        }
      }

      // Check required components/functions exist in codebase
      // This is a simplified check - in production would parse AST
      let foundFunctions = 0;
      let foundComponents = 0;

      for (const func of feature.requiredFunctions) {
        if (await this.functionExists(func)) {
          foundFunctions++;
        }
      }

      for (const component of feature.requiredComponents) {
        if (await this.componentExists(component)) {
          foundComponents++;
        }
      }

      const functionsComplete = foundFunctions >= feature.requiredFunctions.length * 0.8; // 80% threshold
      const componentsComplete = foundComponents >= feature.requiredComponents.length * 0.8;

      return functionsComplete && componentsComplete;
    } catch (error) {
      console.warn(`⚠️ Error checking feature ${feature.name}:`, error);
      return false;
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    // In a real implementation, this would check the file system
    // For now, we'll simulate based on known files
    const knownFiles = [
      'src/contexts/AuthContext.tsx',
      'src/components/layout/MainLayout.tsx',
      'src/pages/Users.tsx',
      'src/pages/Dashboard.tsx',
      'src/hooks/useAuditLogging.ts'
    ];
    
    return knownFiles.some(file => filePath.includes(file.split('/').pop() || ''));
  }

  private async functionExists(functionName: string): Promise<boolean> {
    // Simulate function detection based on known functions
    const knownFunctions = ['signIn', 'signOut', 'signUp', 'logAuthEvent', 'logPermissionCheck'];
    return knownFunctions.includes(functionName);
  }

  private async componentExists(componentName: string): Promise<boolean> {
    // Simulate component detection
    const knownComponents = ['AuthProvider', 'MainLayout', 'Users', 'Dashboard'];
    return knownComponents.includes(componentName);
  }

  private async validatePhase(phaseNumber: number, completedFeatures: string[]): Promise<{ passed: boolean; errors: string[]; warnings: string[]; score: number }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let score = 0;

    // Phase-specific validation logic
    switch (phaseNumber) {
      case 1:
        if (completedFeatures.includes('Authentication System')) score += 30;
        if (completedFeatures.includes('RBAC Foundation')) score += 25;
        if (completedFeatures.includes('Multi-tenant Foundation')) score += 25;
        if (completedFeatures.includes('Database Setup')) score += 20;
        break;
      case 2:
        if (completedFeatures.includes('Advanced RBAC')) score += 50;
        if (completedFeatures.includes('User Management')) score += 50;
        break;
      default:
        score = completedFeatures.length > 0 ? 50 : 0;
    }

    if (score < 50) {
      warnings.push(`Phase ${phaseNumber} validation score below 50%`);
    }

    return {
      passed: score >= 80,
      errors,
      warnings,
      score: Math.min(score, 100)
    };
  }

  private calculateOverallCompletion(phases: PhaseCompletionStatus[]): number {
    const totalCompletion = phases.reduce((sum, phase) => sum + phase.completionPercentage, 0);
    return Math.round(totalCompletion / phases.length);
  }

  private determineCurrentPhase(phases: PhaseCompletionStatus[]): number {
    for (let i = 0; i < phases.length; i++) {
      if (!phases[i].completed) {
        return i + 1;
      }
    }
    return phases.length; // All phases completed
  }

  private identifyBlockers(phases: PhaseCompletionStatus[]): string[] {
    const blockers: string[] = [];
    
    phases.forEach(phase => {
      if (phase.validationStatus.errors.length > 0) {
        blockers.push(...phase.validationStatus.errors);
      }
    });

    return blockers;
  }

  private generateRecommendations(phases: PhaseCompletionStatus[]): string[] {
    const recommendations: string[] = [];
    
    const currentPhase = phases.find(p => !p.completed);
    if (currentPhase) {
      recommendations.push(`Focus on completing Phase ${currentPhase.phase}: ${currentPhase.name}`);
      recommendations.push(`Next features to implement: ${currentPhase.pendingFeatures.slice(0, 2).join(', ')}`);
    }

    return recommendations;
  }

  private getPhaseName(phaseNumber: number): string {
    const phaseNames = {
      1: 'Foundation',
      2: 'Core Features', 
      3: 'Advanced Features',
      4: 'Polish & Production'
    };
    return phaseNames[phaseNumber as keyof typeof phaseNames] || `Phase ${phaseNumber}`;
  }

  private getEmptyState(): ImplementationState {
    return {
      phases: [],
      overallCompletion: 0,
      currentPhase: 1,
      blockers: ['Scanner initialization failed'],
      recommendations: ['Check system configuration'],
      lastScanned: new Date().toISOString()
    };
  }
}

export const implementationStateScanner = new ImplementationStateScannerService();
