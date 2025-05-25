
// AI Implementation Advisor
// Provides intelligent guidance for implementation decisions and prevents redundant work

import { implementationStateManager, ImplementationTask, ValidationCriteria } from './ImplementationStateManager';
import { taskPreventionGuard, TaskPreventionResult } from './TaskPreventionGuard';

export interface ImplementationAdvice {
  shouldProceed: boolean;
  priority: 'critical' | 'high' | 'medium' | 'low' | 'blocked';
  advice: string;
  nextSteps: string[];
  blockers: string[];
  estimatedEffort: 'low' | 'medium' | 'high';
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  alternatives?: string[];
}

export interface TaskContext {
  component: string;
  feature: string;
  description: string;
  requestedBy: 'user' | 'ai' | 'system';
  urgency: 'low' | 'medium' | 'high';
  phaseId?: string;
}

export class AIImplementationAdvisor {
  private static instance: AIImplementationAdvisor;

  private constructor() {}

  static getInstance(): AIImplementationAdvisor {
    if (!AIImplementationAdvisor.instance) {
      AIImplementationAdvisor.instance = new AIImplementationAdvisor();
    }
    return AIImplementationAdvisor.instance;
  }

  analyzeImplementationRequest(context: TaskContext): ImplementationAdvice {
    // Check if task is already completed
    const preventionResult = taskPreventionGuard.checkTaskImplementation(
      context.component,
      context.feature,
      context.phaseId
    );

    if (!preventionResult.allowed) {
      return this.createPreventionAdvice(preventionResult, context);
    }

    // Analyze current phase readiness
    const currentPhase = this.getCurrentPhase();
    const phaseReadiness = this.analyzePhaseReadiness(currentPhase);

    // Check dependencies
    const dependencies = this.analyzeDependencies(context);
    
    // Calculate priority and risk
    const priority = this.calculatePriority(context, dependencies);
    const riskLevel = this.assessRisk(context, dependencies);

    return {
      shouldProceed: true,
      priority,
      advice: this.generateAdvice(context, dependencies, phaseReadiness),
      nextSteps: this.generateNextSteps(context, dependencies),
      blockers: dependencies.blockers,
      estimatedEffort: this.estimateEffort(context),
      dependencies: dependencies.required,
      riskLevel,
      alternatives: this.suggestAlternatives(context)
    };
  }

  private createPreventionAdvice(
    preventionResult: TaskPreventionResult,
    context: TaskContext
  ): ImplementationAdvice {
    return {
      shouldProceed: false,
      priority: 'blocked',
      advice: `🚫 ${preventionResult.reason}\n\n${preventionResult.suggestedAction}`,
      nextSteps: [
        'Review existing implementation',
        'Run validation if needed',
        'Focus on incomplete tasks instead'
      ],
      blockers: [`Task already ${preventionResult.validationStatus}`],
      estimatedEffort: 'low',
      dependencies: [],
      riskLevel: 'low',
      alternatives: this.getAlternativeTaskSuggestions(context)
    };
  }

  private getCurrentPhase(): string {
    const progress = implementationStateManager.getAllProgress();
    
    // Find the most advanced phase that's not fully completed
    for (let i = 1; i <= 4; i++) {
      const phaseId = `phase${i}`;
      const phase = progress.phases.find(p => p.phaseId === phaseId);
      
      if (phase && phase.validationPercentage < 100) {
        return phaseId;
      }
    }
    
    return 'phase1'; // Default to phase 1
  }

  private analyzePhaseReadiness(phaseId: string): { ready: boolean, blockers: string[] } {
    const phase = implementationStateManager.getPhaseProgress(phaseId);
    
    if (!phase) {
      return { ready: false, blockers: ['Phase not found'] };
    }

    return {
      ready: phase.validationPercentage >= 75, // 75% threshold for readiness
      blockers: phase.blockers
    };
  }

  private analyzeDependencies(context: TaskContext): {
    required: string[];
    blockers: string[];
    recommendations: string[];
  } {
    const dependencies = this.getTaskDependencies(context);
    const blockers: string[] = [];
    const recommendations: string[] = [];

    dependencies.forEach(dep => {
      if (!implementationStateManager.isTaskCompleted(dep)) {
        blockers.push(`Dependency not completed: ${dep}`);
        recommendations.push(`Complete ${dep} first`);
      }
    });

    return {
      required: dependencies,
      blockers,
      recommendations
    };
  }

  private getTaskDependencies(context: TaskContext): string[] {
    const dependencyMap: Record<string, string[]> = {
      // Phase 1 dependencies
      'authentication': ['phase1_database_setup'],
      'rbac': ['phase1_database_setup', 'phase1_authentication_system'],
      'multi_tenant': ['phase1_database_setup', 'phase1_rbac_foundation'],
      'audit': ['phase1_database_setup', 'phase1_authentication_system'],
      
      // Phase 2 dependencies
      'advanced_rbac': ['phase1_rbac_foundation'],
      'user_management': ['phase1_authentication_system', 'phase1_rbac_foundation'],
      'api_integration': ['phase1_authentication_system'],
      
      // Phase 3 dependencies
      'dashboard': ['phase2_advanced_rbac', 'phase2_audit_logging'],
      'monitoring': ['phase2_enhanced_multi_tenant', 'phase3_dashboard'],
      
      // Phase 4 dependencies
      'mobile': ['phase3_dashboard', 'phase3_security_monitoring'],
      'deployment': ['phase3_performance_optimization']
    };

    const taskKey = context.feature.toLowerCase().replace(/\s+/g, '_');
    return dependencyMap[taskKey] || [];
  }

  private calculatePriority(
    context: TaskContext,
    dependencies: { blockers: string[] }
  ): 'critical' | 'high' | 'medium' | 'low' | 'blocked' {
    if (dependencies.blockers.length > 0) return 'blocked';
    
    if (context.urgency === 'high') return 'critical';
    
    // Phase 1 tasks are always high priority
    if (context.phaseId === 'phase1') return 'high';
    
    // Security and foundation tasks are high priority
    const highPriorityKeywords = ['security', 'auth', 'database', 'rbac'];
    if (highPriorityKeywords.some(keyword => 
      context.feature.toLowerCase().includes(keyword) || 
      context.component.toLowerCase().includes(keyword)
    )) {
      return 'high';
    }
    
    return context.urgency === 'medium' ? 'medium' : 'low';
  }

  private assessRisk(
    context: TaskContext,
    dependencies: { blockers: string[] }
  ): 'low' | 'medium' | 'high' {
    let riskScore = 0;
    
    // Dependency risk
    if (dependencies.blockers.length > 2) riskScore += 3;
    else if (dependencies.blockers.length > 0) riskScore += 1;
    
    // Complexity risk
    const complexityKeywords = ['advanced', 'optimization', 'integration', 'dashboard'];
    if (complexityKeywords.some(keyword => 
      context.feature.toLowerCase().includes(keyword)
    )) {
      riskScore += 2;
    }
    
    // Phase risk (later phases are riskier)
    if (context.phaseId === 'phase4') riskScore += 2;
    else if (context.phaseId === 'phase3') riskScore += 1;
    
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  private generateAdvice(
    context: TaskContext,
    dependencies: { required: string[], blockers: string[], recommendations: string[] },
    phaseReadiness: { ready: boolean, blockers: string[] }
  ): string {
    let advice = `📋 Implementation Analysis for: ${context.feature}\n\n`;
    
    if (dependencies.blockers.length > 0) {
      advice += `⚠️ BLOCKERS DETECTED:\n`;
      dependencies.blockers.forEach(blocker => advice += `   • ${blocker}\n`);
      advice += '\n';
    }
    
    if (!phaseReadiness.ready) {
      advice += `🚧 PHASE READINESS CONCERN:\n`;
      advice += `   Current phase has ${phaseReadiness.blockers.length} blockers\n`;
      phaseReadiness.blockers.forEach(blocker => advice += `   • ${blocker}\n`);
      advice += '\n';
    }
    
    if (dependencies.recommendations.length > 0) {
      advice += `💡 RECOMMENDATIONS:\n`;
      dependencies.recommendations.forEach(rec => advice += `   • ${rec}\n`);
      advice += '\n';
    }
    
    advice += `🎯 IMPLEMENTATION STRATEGY:\n`;
    advice += `   • Follow enterprise implementation patterns\n`;
    advice += `   • Implement comprehensive testing\n`;
    advice += `   • Ensure proper documentation\n`;
    advice += `   • Validate against performance standards\n`;
    
    return advice;
  }

  private generateNextSteps(
    context: TaskContext,
    dependencies: { required: string[], blockers: string[] }
  ): string[] {
    const steps: string[] = [];
    
    if (dependencies.blockers.length > 0) {
      steps.push('Complete dependency tasks first');
      dependencies.required.forEach(dep => {
        if (!implementationStateManager.isTaskCompleted(dep)) {
          steps.push(`Implement ${dep}`);
        }
      });
    } else {
      steps.push('Review implementation documentation');
      steps.push('Set up testing framework');
      steps.push('Implement core functionality');
      steps.push('Add comprehensive tests');
      steps.push('Validate performance requirements');
      steps.push('Update implementation tracking');
    }
    
    return steps;
  }

  private estimateEffort(context: TaskContext): 'low' | 'medium' | 'high' {
    const highEffortKeywords = ['dashboard', 'optimization', 'advanced', 'integration'];
    const mediumEffortKeywords = ['management', 'monitoring', 'enhanced'];
    
    const feature = context.feature.toLowerCase();
    
    if (highEffortKeywords.some(keyword => feature.includes(keyword))) return 'high';
    if (mediumEffortKeywords.some(keyword => feature.includes(keyword))) return 'medium';
    return 'low';
  }

  private suggestAlternatives(context: TaskContext): string[] {
    const alternatives: string[] = [];
    
    // Suggest simpler alternatives for complex tasks
    if (context.feature.toLowerCase().includes('advanced')) {
      alternatives.push('Implement basic version first');
      alternatives.push('Use existing component library');
    }
    
    if (context.feature.toLowerCase().includes('dashboard')) {
      alternatives.push('Start with simple data display');
      alternatives.push('Use pre-built dashboard components');
    }
    
    return alternatives;
  }

  private getAlternativeTaskSuggestions(context: TaskContext): string[] {
    const progress = implementationStateManager.getAllProgress();
    const suggestions: string[] = [];
    
    // Find incomplete tasks in current phase
    const currentPhase = this.getCurrentPhase();
    const phase = progress.phases.find(p => p.phaseId === currentPhase);
    
    if (phase && phase.completedTasks < phase.totalTasks) {
      suggestions.push(`Complete remaining ${currentPhase} tasks`);
      suggestions.push('Focus on validation of completed tasks');
    }
    
    suggestions.push('Review implementation progress dashboard');
    suggestions.push('Run comprehensive validation tests');
    
    return suggestions;
  }

  generateProgressReport(): string {
    const progress = implementationStateManager.getAllProgress();
    let report = '\n🎯 ENTERPRISE IMPLEMENTATION STATUS REPORT\n';
    report += '=' .repeat(60) + '\n';
    report += `📊 Overall Progress: ${progress.overallCompletion}%\n\n`;

    progress.phases.forEach(phase => {
      const status = phase.readyForNextPhase ? '✅' : '🔧';
      report += `${status} ${phase.phaseName}\n`;
      report += `   📈 Completion: ${phase.completionPercentage}%\n`;
      report += `   🔍 Validation: ${phase.validationPercentage}%\n`;
      
      if (phase.blockers.length > 0) {
        report += `   ⚠️  Issues: ${phase.blockers.length}\n`;
      }
      report += '\n';
    });

    report += '💡 NEXT RECOMMENDED ACTIONS:\n';
    const currentPhase = this.getCurrentPhase();
    const currentPhaseData = progress.phases.find(p => p.phaseId === currentPhase);
    
    if (currentPhaseData) {
      if (currentPhaseData.blockers.length > 0) {
        report += `   1. Resolve ${currentPhase} blockers\n`;
      } else if (currentPhaseData.completionPercentage < 100) {
        report += `   1. Complete remaining ${currentPhase} tasks\n`;
      } else if (currentPhaseData.validationPercentage < 85) {
        report += `   1. Validate ${currentPhase} implementations\n`;
      } else {
        const nextPhase = `phase${parseInt(currentPhase.replace('phase', '')) + 1}`;
        report += `   1. Begin ${nextPhase} implementation\n`;
      }
    }
    
    report += '   2. Run comprehensive testing suite\n';
    report += '   3. Review performance benchmarks\n';
    
    return report;
  }
}

// Export singleton instance
export const aiImplementationAdvisor = AIImplementationAdvisor.getInstance();
