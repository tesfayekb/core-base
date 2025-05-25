
// Task Prevention Guard
// Prevents AI from reworking already completed and validated tasks

import { implementationStateManager } from './ImplementationStateManager';

export interface TaskPreventionResult {
  allowed: boolean;
  taskId: string;
  reason?: string;
  suggestedAction?: string;
  completedAt?: Date;
  validationStatus?: string;
}

export class TaskPreventionGuard {
  private static instance: TaskPreventionGuard;

  private constructor() {}

  static getInstance(): TaskPreventionGuard {
    if (!TaskPreventionGuard.instance) {
      TaskPreventionGuard.instance = new TaskPreventionGuard();
    }
    return TaskPreventionGuard.instance;
  }

  checkTaskImplementation(
    componentName: string,
    taskDescription: string,
    phaseId?: string
  ): TaskPreventionResult {
    const taskId = this.generateTaskId(componentName, taskDescription, phaseId);
    const preventionCheck = implementationStateManager.preventRework(taskId);

    if (!preventionCheck.canProceed) {
      const task = implementationStateManager['tasks'].get(taskId);
      return {
        allowed: false,
        taskId,
        reason: preventionCheck.reason,
        suggestedAction: this.getSuggestedAction(task?.status || 'unknown'),
        completedAt: task?.completedAt,
        validationStatus: task?.status
      };
    }

    return {
      allowed: true,
      taskId
    };
  }

  private generateTaskId(
    componentName: string,
    taskDescription: string,
    phaseId?: string
  ): string {
    const normalizedComponent = componentName.toLowerCase().replace(/\s+/g, '_');
    const normalizedTask = taskDescription.toLowerCase().replace(/\s+/g, '_');
    const phase = phaseId || this.inferPhaseFromTask(normalizedTask);
    
    return `${phase}_${normalizedComponent}_${normalizedTask}`;
  }

  private inferPhaseFromTask(taskDescription: string): string {
    const phase1Keywords = ['database', 'auth', 'rbac', 'foundation', 'setup', 'security'];
    const phase2Keywords = ['advanced', 'enhanced', 'user', 'management', 'api'];
    const phase3Keywords = ['dashboard', 'monitoring', 'optimization', 'visualization'];
    const phase4Keywords = ['mobile', 'polish', 'deployment', 'production'];

    const task = taskDescription.toLowerCase();

    if (phase4Keywords.some(keyword => task.includes(keyword))) return 'phase4';
    if (phase3Keywords.some(keyword => task.includes(keyword))) return 'phase3';
    if (phase2Keywords.some(keyword => task.includes(keyword))) return 'phase2';
    if (phase1Keywords.some(keyword => task.includes(keyword))) return 'phase1';

    return 'phase1'; // Default to phase1
  }

  private getSuggestedAction(status: string): string {
    switch (status) {
      case 'validated':
        return 'This task is fully completed and validated. No action needed. Focus on uncompleted tasks instead.';
      case 'completed':
        return 'This task is completed but needs validation. Run validation tests instead of reimplementing.';
      case 'failed':
        return 'This task previously failed validation. Review validation results and fix specific issues.';
      case 'in_progress':
        return 'This task is currently in progress. Check current implementation status before proceeding.';
      default:
        return 'Check task status before proceeding.';
    }
  }

  logPreventionAttempt(result: TaskPreventionResult): void {
    if (!result.allowed) {
      console.warn(`🚫 TASK PREVENTION: ${result.reason}`);
      console.info(`💡 SUGGESTED ACTION: ${result.suggestedAction}`);
      
      if (result.completedAt) {
        console.info(`📅 Originally completed: ${result.completedAt.toLocaleDateString()}`);
      }
    }
  }

  getCompletedTasksSummary(): string {
    const progress = implementationStateManager.getAllProgress();
    let summary = '\n🎯 IMPLEMENTATION PROGRESS SUMMARY\n';
    summary += '=' .repeat(50) + '\n';
    summary += `Overall Completion: ${progress.overallCompletion}%\n\n`;

    progress.phases.forEach(phase => {
      summary += `📋 ${phase.phaseName} (${phase.phaseId})\n`;
      summary += `   ✅ Completed: ${phase.completedTasks}/${phase.totalTasks} (${phase.completionPercentage}%)\n`;
      summary += `   🔍 Validated: ${phase.validatedTasks}/${phase.totalTasks} (${phase.validationPercentage}%)\n`;
      summary += `   🚀 Ready for next: ${phase.readyForNextPhase ? 'YES' : 'NO'}\n`;
      
      if (phase.blockers.length > 0) {
        summary += `   ⚠️  Blockers: ${phase.blockers.join(', ')}\n`;
      }
      summary += '\n';
    });

    return summary;
  }
}

// Export singleton instance
export const taskPreventionGuard = TaskPreventionGuard.getInstance();
