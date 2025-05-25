
// Secure Implementation State Scanner
// Security-enhanced version with proper access controls

import { secureFileSystemScanner } from './SecureFileSystemScanner';
import { ImplementationState, PhaseState, ValidationStatus } from '@/types/ImplementationState';

class SecureImplementationStateScannerService {
  async scanImplementationState(requesterId: string = 'system'): Promise<ImplementationState> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Starting secure implementation state scan...');
      
      // Define scan targets with security constraints
      const scanTargets = this.getScanTargets();
      
      // Perform secure multi-file scan
      const scanResults = await secureFileSystemScanner.scanMultipleFiles(
        scanTargets,
        requesterId
      );

      if (scanResults.failed.length > 0) {
        console.warn('⚠️ Some files failed security scan:', scanResults.failed);
      }

      // Analyze successful scans
      const phases = this.analyzePhases(scanResults.successful);
      const overall = this.calculateOverallProgress(phases);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Secure scan completed in ${duration}ms`);
      
      return {
        phases,
        overallCompletion: overall.completion,
        currentPhase: overall.currentPhase,
        blockers: overall.blockers,
        recommendations: this.generateSecureRecommendations(phases, scanResults.failed),
        lastScanned: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Secure implementation scan failed:', error);
      return this.getEmptyState('Security scan failed');
    }
  }

  private getScanTargets(): string[] {
    // Only scan approved file patterns
    return [
      'src/components/**/*.tsx',
      'src/components/**/*.ts',
      'src/services/**/*.ts',
      'src/hooks/**/*.ts',
      'src/utils/**/*.ts',
      'src/types/**/*.ts',
      'src/docs/**/*.md',
      'package.json',
      'README.md'
    ];
  }

  private analyzePhases(files: any[]): PhaseState[] {
    const phases: PhaseState[] = [
      {
        phase: 1,
        name: 'Foundation',
        completedFeatures: [],
        pendingFeatures: ['Database Setup', 'Authentication System', 'RBAC Foundation', 'Multi-tenant Foundation'],
        validationStatus: { passed: false, warnings: [], errors: [] }
      },
      {
        phase: 2,
        name: 'Core Features',
        completedFeatures: [],
        pendingFeatures: ['User Management', 'Advanced RBAC', 'Enhanced Multi-tenant'],
        validationStatus: { passed: false, warnings: [], errors: [] }
      },
      {
        phase: 3,
        name: 'Advanced Features',
        completedFeatures: [],
        pendingFeatures: ['Audit Dashboard', 'Security Monitoring', 'Performance Optimization'],
        validationStatus: { passed: false, warnings: [], errors: [] }
      },
      {
        phase: 4,
        name: 'Production',
        completedFeatures: [],
        pendingFeatures: ['Mobile Strategy', 'UI Polish', 'Production Deployment'],
        validationStatus: { passed: false, warnings: [], errors: [] }
      }
    ];

    // Analyze files to determine completion (simplified for security)
    const hasAuth = files.some(f => f.path.includes('auth') || f.path.includes('Auth'));
    const hasRBAC = files.some(f => f.path.includes('rbac') || f.path.includes('RBAC'));
    const hasMultiTenant = files.some(f => f.path.includes('tenant') || f.path.includes('Tenant'));
    const hasDatabase = files.some(f => f.path.includes('database') || f.path.includes('Database'));

    if (hasDatabase) {
      phases[0].completedFeatures.push('Database Setup');
      phases[0].pendingFeatures = phases[0].pendingFeatures.filter(f => f !== 'Database Setup');
    }

    if (hasAuth) {
      phases[0].completedFeatures.push('Authentication System');
      phases[0].pendingFeatures = phases[0].pendingFeatures.filter(f => f !== 'Authentication System');
    }

    if (hasRBAC) {
      phases[0].completedFeatures.push('RBAC Foundation');
      phases[0].pendingFeatures = phases[0].pendingFeatures.filter(f => f !== 'RBAC Foundation');
    }

    if (hasMultiTenant) {
      phases[0].completedFeatures.push('Multi-tenant Foundation');
      phases[0].pendingFeatures = phases[0].pendingFeatures.filter(f => f !== 'Multi-tenant Foundation');
    }

    // Update validation status
    phases.forEach(phase => {
      const totalFeatures = phase.completedFeatures.length + phase.pendingFeatures.length;
      const completionRate = totalFeatures > 0 ? phase.completedFeatures.length / totalFeatures : 0;
      
      phase.validationStatus.passed = completionRate >= 0.8;
      
      if (completionRate < 0.5) {
        phase.validationStatus.warnings.push('Phase significantly incomplete');
      }
    });

    return phases;
  }

  private calculateOverallProgress(phases: PhaseState[]): {
    completion: number;
    currentPhase: number;
    blockers: string[];
  } {
    let totalFeatures = 0;
    let completedFeatures = 0;
    let currentPhase = 1;
    const blockers: string[] = [];

    phases.forEach((phase, index) => {
      const phaseTotal = phase.completedFeatures.length + phase.pendingFeatures.length;
      totalFeatures += phaseTotal;
      completedFeatures += phase.completedFeatures.length;
      
      if (phase.completedFeatures.length > 0 && phase.pendingFeatures.length === 0) {
        currentPhase = Math.max(currentPhase, index + 2);
      }
      
      if (phase.validationStatus.errors.length > 0) {
        blockers.push(...phase.validationStatus.errors);
      }
    });

    const completion = totalFeatures > 0 ? Math.round((completedFeatures / totalFeatures) * 100) : 0;

    return { completion, currentPhase: Math.min(currentPhase, 4), blockers };
  }

  private generateSecureRecommendations(phases: PhaseState[], failedScans: any[]): string[] {
    const recommendations: string[] = [];

    // Security-focused recommendations
    if (failedScans.length > 0) {
      recommendations.push('Review and resolve file access security violations');
    }

    // Add phase-specific recommendations
    const currentPhaseIndex = phases.findIndex(p => p.pendingFeatures.length > 0);
    if (currentPhaseIndex >= 0) {
      const currentPhase = phases[currentPhaseIndex];
      if (currentPhase.pendingFeatures.length > 0) {
        recommendations.push(`Implement ${currentPhase.pendingFeatures[0]} to progress Phase ${currentPhase.phase}`);
      }
    }

    // Security enhancement recommendations
    recommendations.push('Ensure all file scanning follows security protocols');
    recommendations.push('Monitor rate limits and access patterns');
    recommendations.push('Review security violations regularly');

    return recommendations;
  }

  private getEmptyState(reason: string): ImplementationState {
    return {
      phases: [],
      overallCompletion: 0,
      currentPhase: 1,
      blockers: [reason],
      recommendations: ['Resolve security configuration issues', 'Ensure proper file access permissions'],
      lastScanned: new Date().toISOString()
    };
  }

  getSecurityStatus() {
    return secureFileSystemScanner.getSecurityStatus();
  }
}

export const secureImplementationStateScanner = new SecureImplementationStateScannerService();
