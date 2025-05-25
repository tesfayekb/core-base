
// Enterprise Implementation State Manager
// Centralized tracking of all implementation progress with persistence and validation

export interface ImplementationTask {
  id: string;
  phaseId: string;
  componentName: string;
  taskName: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'validated' | 'failed';
  completedAt?: Date;
  validatedAt?: Date;
  dependencies: string[];
  validationCriteria: ValidationCriteria[];
  implementationHash?: string; // Hash of implemented code for change detection
  lastModified: Date;
  version: string;
}

export interface ValidationCriteria {
  type: 'unit_test' | 'integration_test' | 'performance_benchmark' | 'security_check';
  description: string;
  passed: boolean;
  metrics?: Record<string, any>;
  lastValidated?: Date;
}

export interface PhaseProgress {
  phaseId: string;
  phaseName: string;
  totalTasks: number;
  completedTasks: number;
  validatedTasks: number;
  completionPercentage: number;
  validationPercentage: number;
  readyForNextPhase: boolean;
  blockers: string[];
}

export class ImplementationStateManager {
  private static instance: ImplementationStateManager;
  private tasks: Map<string, ImplementationTask> = new Map();
  private phases: Map<string, PhaseProgress> = new Map();
  private storageKey = 'enterprise_implementation_state';

  private constructor() {
    this.loadFromStorage();
    this.initializePhases();
  }

  static getInstance(): ImplementationStateManager {
    if (!ImplementationStateManager.instance) {
      ImplementationStateManager.instance = new ImplementationStateManager();
    }
    return ImplementationStateManager.instance;
  }

  private loadFromStorage(): void {
    try {
      const storedState = localStorage.getItem(this.storageKey);
      if (storedState) {
        const state = JSON.parse(storedState);
        this.tasks = new Map(state.tasks || []);
        this.phases = new Map(state.phases || []);
        
        // Convert date strings back to Date objects
        this.tasks.forEach(task => {
          if (task.completedAt) task.completedAt = new Date(task.completedAt);
          if (task.validatedAt) task.validatedAt = new Date(task.validatedAt);
          task.lastModified = new Date(task.lastModified);
        });
      }
    } catch (error) {
      console.error('Failed to load implementation state from storage:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const state = {
        tasks: Array.from(this.tasks.entries()),
        phases: Array.from(this.phases.entries()),
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save implementation state to storage:', error);
    }
  }

  private initializePhases(): void {
    const phaseDefinitions = [
      {
        id: 'phase1',
        name: 'Foundation',
        tasks: [
          'database_setup', 'authentication_system', 'rbac_foundation',
          'multi_tenant_foundation', 'audit_foundation', 'security_infrastructure'
        ]
      },
      {
        id: 'phase2',
        name: 'Core Features',
        tasks: [
          'advanced_rbac', 'enhanced_multi_tenant', 'audit_logging',
          'user_management', 'api_integration', 'ui_enhancement'
        ]
      },
      {
        id: 'phase3',
        name: 'Advanced Features',
        tasks: [
          'audit_dashboard', 'security_monitoring', 'performance_optimization',
          'data_visualization', 'testing_framework'
        ]
      },
      {
        id: 'phase4',
        name: 'Production Ready',
        tasks: [
          'mobile_strategy', 'security_hardening', 'ui_polish',
          'deployment_preparation', 'documentation_completion'
        ]
      }
    ];

    phaseDefinitions.forEach(phase => {
      if (!this.phases.has(phase.id)) {
        this.phases.set(phase.id, {
          phaseId: phase.id,
          phaseName: phase.name,
          totalTasks: phase.tasks.length,
          completedTasks: 0,
          validatedTasks: 0,
          completionPercentage: 0,
          validationPercentage: 0,
          readyForNextPhase: false,
          blockers: []
        });
      }

      // Initialize tasks if they don't exist
      phase.tasks.forEach(taskName => {
        const taskId = `${phase.id}_${taskName}`;
        if (!this.tasks.has(taskId)) {
          this.registerTask({
            id: taskId,
            phaseId: phase.id,
            componentName: taskName.split('_')[0],
            taskName: taskName,
            status: 'not_started',
            dependencies: [],
            validationCriteria: [],
            lastModified: new Date(),
            version: '1.0.0'
          });
        }
      });
    });
  }

  registerTask(task: ImplementationTask): void {
    this.tasks.set(task.id, task);
    this.updatePhaseProgress(task.phaseId);
    this.saveToStorage();
  }

  markTaskCompleted(taskId: string, implementationHash?: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return;
    }

    task.status = 'completed';
    task.completedAt = new Date();
    task.lastModified = new Date();
    if (implementationHash) {
      task.implementationHash = implementationHash;
    }

    this.tasks.set(taskId, task);
    this.updatePhaseProgress(task.phaseId);
    this.saveToStorage();

    console.log(`✅ Task completed: ${task.taskName}`);
  }

  validateTask(taskId: string, validationResults: ValidationCriteria[]): boolean {
    const task = this.tasks.get(taskId);
    if (!task) {
      console.error(`Task ${taskId} not found`);
      return false;
    }

    task.validationCriteria = validationResults;
    const allPassed = validationResults.every(criteria => criteria.passed);
    
    if (allPassed) {
      task.status = 'validated';
      task.validatedAt = new Date();
      console.log(`✅ Task validated: ${task.taskName}`);
    } else {
      task.status = 'failed';
      console.log(`❌ Task validation failed: ${task.taskName}`);
    }

    task.lastModified = new Date();
    this.tasks.set(taskId, task);
    this.updatePhaseProgress(task.phaseId);
    this.saveToStorage();

    return allPassed;
  }

  isTaskCompleted(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    return task?.status === 'completed' || task?.status === 'validated';
  }

  getTaskStatus(taskId: string): string {
    const task = this.tasks.get(taskId);
    return task?.status || 'not_found';
  }

  getPhaseProgress(phaseId: string): PhaseProgress | null {
    return this.phases.get(phaseId) || null;
  }

  getAllProgress(): { phases: PhaseProgress[], overallCompletion: number } {
    const phases = Array.from(this.phases.values());
    const totalTasks = phases.reduce((sum, phase) => sum + phase.totalTasks, 0);
    const completedTasks = phases.reduce((sum, phase) => sum + phase.validatedTasks, 0);
    const overallCompletion = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return { phases, overallCompletion };
  }

  private updatePhaseProgress(phaseId: string): void {
    const phase = this.phases.get(phaseId);
    if (!phase) return;

    const phaseTasks = Array.from(this.tasks.values()).filter(task => task.phaseId === phaseId);
    const completedTasks = phaseTasks.filter(task => task.status === 'completed' || task.status === 'validated').length;
    const validatedTasks = phaseTasks.filter(task => task.status === 'validated').length;

    phase.completedTasks = completedTasks;
    phase.validatedTasks = validatedTasks;
    phase.completionPercentage = Math.round((completedTasks / phase.totalTasks) * 100);
    phase.validationPercentage = Math.round((validatedTasks / phase.totalTasks) * 100);
    phase.readyForNextPhase = phase.validationPercentage >= 85; // 85% validation threshold

    // Check for blockers
    phase.blockers = phaseTasks
      .filter(task => task.status === 'failed')
      .map(task => task.taskName);

    this.phases.set(phaseId, phase);
  }

  preventRework(taskId: string): { canProceed: boolean, reason?: string } {
    const task = this.tasks.get(taskId);
    if (!task) {
      return { canProceed: true };
    }

    if (task.status === 'validated') {
      return {
        canProceed: false,
        reason: `Task "${task.taskName}" is already completed and validated. Last completed: ${task.completedAt?.toLocaleDateString()}`
      };
    }

    if (task.status === 'completed') {
      return {
        canProceed: false,
        reason: `Task "${task.taskName}" is already completed but needs validation. Use validation instead of reimplementation.`
      };
    }

    return { canProceed: true };
  }

  exportState(): string {
    const state = {
      tasks: Array.from(this.tasks.entries()),
      phases: Array.from(this.phases.entries()),
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    return JSON.stringify(state, null, 2);
  }

  importState(stateJson: string): boolean {
    try {
      const state = JSON.parse(stateJson);
      this.tasks = new Map(state.tasks);
      this.phases = new Map(state.phases);
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }
}

// Export singleton instance
export const implementationStateManager = ImplementationStateManager.getInstance();
