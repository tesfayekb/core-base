
// AI Integration Guard
// Automatically integrates with AI workflow to enforce task prevention

import { taskPreventionGuard, TaskPreventionResult } from './TaskPreventionGuard';
import { implementationStateManager } from './ImplementationStateManager';

export interface AIWorkflowContext {
  requestType: 'implementation' | 'enhancement' | 'bug_fix' | 'refactor';
  componentName: string;
  description: string;
  phaseId?: string;
  force?: boolean; // Allow override for legitimate rework
}

export interface AIGuardResult {
  allowed: boolean;
  reason?: string;
  suggestedAction?: string;
  alternativeApproach?: string;
  taskId?: string;
  completionStatus?: string;
}

export class AIIntegrationGuard {
  private static instance: AIIntegrationGuard;

  private constructor() {}

  static getInstance(): AIIntegrationGuard {
    if (!AIIntegrationGuard.instance) {
      AIIntegrationGuard.instance = new AIIntegrationGuard();
    }
    return AIIntegrationGuard.instance;
  }

  /**
   * Main method called before any AI implementation work
   */
  checkAIWorkflow(context: AIWorkflowContext): AIGuardResult {
    // Allow bug fixes and critical patches
    if (context.requestType === 'bug_fix' || context.force) {
      return { allowed: true };
    }

    // Check against completed tasks
    const preventionResult = taskPreventionGuard.checkTaskImplementation(
      context.componentName,
      context.description,
      context.phaseId
    );

    if (!preventionResult.allowed) {
      return this.createBlockedResult(preventionResult, context);
    }

    // Check phase sequencing
    const phaseCheck = this.validatePhaseSequence(context.phaseId);
    if (!phaseCheck.allowed) {
      return phaseCheck;
    }

    // Log the approval and track the new work
    this.logWorkflowApproval(context, preventionResult.taskId);

    return { 
      allowed: true, 
      taskId: preventionResult.taskId,
      completionStatus: 'approved_for_implementation'
    };
  }

  private createBlockedResult(
    preventionResult: TaskPreventionResult, 
    context: AIWorkflowContext
  ): AIGuardResult {
    let alternativeApproach = '';
    
    if (preventionResult.validationStatus === 'validated') {
      alternativeApproach = 'This task is complete. Consider:\n' +
        '• Enhancing existing functionality instead\n' +
        '• Moving to the next phase task\n' +
        '• Addressing validation issues if any exist';
    } else if (preventionResult.validationStatus === 'completed') {
      alternativeApproach = 'Task needs validation, not reimplementation:\n' +
        '• Run validation tests\n' +
        '• Review completion criteria\n' +
        '• Address any validation failures';
    }

    return {
      allowed: false,
      reason: preventionResult.reason,
      suggestedAction: preventionResult.suggestedAction,
      alternativeApproach,
      taskId: preventionResult.taskId,
      completionStatus: preventionResult.validationStatus
    };
  }

  private validatePhaseSequence(phaseId?: string): AIGuardResult {
    if (!phaseId) return { allowed: true };

    const progress = implementationStateManager.getAllProgress();
    const currentPhase = progress.phases.find(p => p.phaseId === phaseId);
    
    if (!currentPhase) {
      return { allowed: true }; // Unknown phase, allow
    }

    // Check if previous phases are complete
    const phaseOrder = ['phase1', 'phase2', 'phase3', 'phase4'];
    const currentIndex = phaseOrder.indexOf(phaseId);
    
    if (currentIndex > 0) {
      const previousPhaseId = phaseOrder[currentIndex - 1];
      const previousPhase = progress.phases.find(p => p.phaseId === previousPhaseId);
      
      if (previousPhase && !previousPhase.readyForNextPhase) {
        return {
          allowed: false,
          reason: `Cannot start ${currentPhase.phaseName} until ${previousPhase.phaseName} is complete`,
          suggestedAction: `Complete ${previousPhase.phaseName} validation first. Current validation: ${previousPhase.validationPercentage}%`
        };
      }
    }

    return { allowed: true };
  }

  private logWorkflowApproval(context: AIWorkflowContext, taskId: string): void {
    console.log(`🤖 AI WORKFLOW APPROVED`, {
      taskId,
      component: context.componentName,
      type: context.requestType,
      phase: context.phaseId,
      timestamp: new Date().toISOString()
    });

    // Mark task as in progress
    const task = implementationStateManager['tasks'].get(taskId);
    if (task && task.status === 'not_started') {
      task.status = 'in_progress';
      task.lastModified = new Date();
      implementationStateManager['tasks'].set(taskId, task);
    }
  }

  /**
   * Generate comprehensive prevention report for AI context
   */
  generatePreventionReport(): string {
    const summary = taskPreventionGuard.getCompletedTasksSummary();
    const progress = implementationStateManager.getAllProgress();
    
    let report = '\n🚨 AI WORKFLOW PREVENTION REPORT\n';
    report += '=' .repeat(60) + '\n\n';
    
    report += 'CRITICAL: Before implementing any features, check this report!\n\n';
    
    report += summary;
    
    report += '\n📋 NEXT RECOMMENDED ACTIONS:\n';
    report += '-' .repeat(40) + '\n';
    
    for (const phase of progress.phases) {
      if (!phase.readyForNextPhase) {
        report += `🎯 ${phase.phaseName}:\n`;
        report += `   - Complete validation: ${phase.validationPercentage}% (need 85%)\n`;
        if (phase.blockers.length > 0) {
          report += `   - Fix blockers: ${phase.blockers.join(', ')}\n`;
        }
        report += '\n';
        break; // Show only the next phase
      }
    }
    
    return report;
  }

  /**
   * Get enforcement status for dashboard
   */
  getEnforcementStatus(): {
    active: boolean;
    tasksTracked: number;
    lastEnforcement?: Date;
    preventedRework: number;
  } {
    const allTasks = Array.from(implementationStateManager['tasks'].values());
    const validatedTasks = allTasks.filter(t => t.status === 'validated').length;
    
    return {
      active: true,
      tasksTracked: allTasks.length,
      lastEnforcement: new Date(),
      preventedRework: validatedTasks
    };
  }
}

// Export singleton instance
export const aiIntegrationGuard = AIIntegrationGuard.getInstance();

// Auto-enforcement hook for AI workflows
export const enforceAIWorkflow = (context: AIWorkflowContext): AIGuardResult => {
  const result = aiIntegrationGuard.checkAIWorkflow(context);
  
  if (!result.allowed) {
    console.warn('🚫 AI WORKFLOW BLOCKED:', result.reason);
    console.info('💡 SUGGESTED ACTION:', result.suggestedAction);
    if (result.alternativeApproach) {
      console.info('🔄 ALTERNATIVE APPROACH:\n', result.alternativeApproach);
    }
  }
  
  return result;
};
