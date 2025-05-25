
// Integration Manager
// Coordinates all integration services and real-time updates

import { fileWatcher, FileChangeEvent } from './FileWatcher';
import { ideIntegration } from './IDEIntegration';
import { cicdIntegration } from './CICDIntegration';
import { aiContextService } from './AIContextService';

export interface IntegrationStatus {
  fileWatcher: boolean;
  ideIntegration: boolean;
  cicdIntegration: boolean;
  aiContext: boolean;
  lastUpdate: Date | null;
}

export interface IntegrationConfig {
  enableFileWatcher: boolean;
  enableIDEIntegration: boolean;
  enableCICDIntegration: boolean;
  autoInvalidateCache: boolean;
  realTimeUpdates: boolean;
}

class IntegrationManagerService {
  private config: IntegrationConfig;
  private isInitialized = false;
  private status: IntegrationStatus;

  constructor() {
    this.config = {
      enableFileWatcher: true,
      enableIDEIntegration: true,
      enableCICDIntegration: true,
      autoInvalidateCache: true,
      realTimeUpdates: true
    };

    this.status = {
      fileWatcher: false,
      ideIntegration: false,
      cicdIntegration: false,
      aiContext: false,
      lastUpdate: null
    };
  }

  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing Integration Manager...');

      // Initialize file watcher
      if (this.config.enableFileWatcher) {
        await this.initializeFileWatcher();
      }

      // Initialize IDE integration
      if (this.config.enableIDEIntegration) {
        await this.initializeIDEIntegration();
      }

      // Initialize CI/CD integration
      if (this.config.enableCICDIntegration) {
        await this.initializeCICDIntegration();
      }

      // Initialize AI context service
      await this.initializeAIContext();

      this.isInitialized = true;
      this.status.lastUpdate = new Date();

      console.log('✅ Integration Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Integration Manager:', error);
      throw error;
    }
  }

  private async initializeFileWatcher(): Promise<void> {
    try {
      // Set up file change handler for cache invalidation
      fileWatcher.addChangeHandler(this.handleFileChange.bind(this));
      
      await fileWatcher.startWatching();
      this.status.fileWatcher = true;
      
      console.log('✅ File watcher integration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize file watcher:', error);
    }
  }

  private async initializeIDEIntegration(): Promise<void> {
    try {
      await ideIntegration.initialize();
      this.status.ideIntegration = true;
      
      console.log('✅ IDE integration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize IDE integration:', error);
    }
  }

  private async initializeCICDIntegration(): Promise<void> {
    try {
      // CI/CD integration is always ready, no async initialization needed
      this.status.cicdIntegration = true;
      
      console.log('✅ CI/CD integration initialized');
    } catch (error) {
      console.error('❌ Failed to initialize CI/CD integration:', error);
    }
  }

  private async initializeAIContext(): Promise<void> {
    try {
      // Generate initial context
      await aiContextService.generateAIContext();
      this.status.aiContext = true;
      
      console.log('✅ AI Context service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize AI Context service:', error);
    }
  }

  private async handleFileChange(event: FileChangeEvent): Promise<void> {
    try {
      console.log(`📁 File change detected: ${event.path} (${event.type})`);

      if (this.config.autoInvalidateCache) {
        await aiContextService.invalidateCache();
        console.log('🔄 AI Context cache invalidated due to file change');
      }

      if (this.config.realTimeUpdates) {
        // Trigger real-time update for connected clients
        this.broadcastUpdate(event);
      }

      this.status.lastUpdate = new Date();
    } catch (error) {
      console.error('❌ Error handling file change:', error);
    }
  }

  private broadcastUpdate(event: FileChangeEvent): void {
    // In a real implementation, this would broadcast to connected clients
    console.log('📡 Broadcasting real-time update:', {
      type: event.type,
      path: event.path,
      timestamp: event.timestamp
    });
  }

  async runCICDValidation(buildContext?: any): Promise<any> {
    if (!this.status.cicdIntegration) {
      throw new Error('CI/CD integration not initialized');
    }

    return await cicdIntegration.runValidation(buildContext);
  }

  async executeIDECommand(commandId: string): Promise<void> {
    if (!this.status.ideIntegration) {
      throw new Error('IDE integration not initialized');
    }

    return await ideIntegration.executeCommand(commandId);
  }

  getIntegrationStatus(): IntegrationStatus {
    return { ...this.status };
  }

  getDeveloperDashboard(): {
    status: IntegrationStatus;
    fileWatcherStatus: any;
    ideStatus: any;
    cicdMetrics: any;
    suggestions: string[];
  } {
    return {
      status: this.getIntegrationStatus(),
      fileWatcherStatus: fileWatcher.getWatchStatus(),
      ideStatus: ideIntegration.getStatus(),
      cicdMetrics: cicdIntegration.getValidationMetrics(),
      suggestions: this.generateSuggestions()
    };
  }

  private generateSuggestions(): string[] {
    const suggestions: string[] = [];

    if (!this.status.fileWatcher) {
      suggestions.push('Enable file watcher for real-time updates');
    }

    if (!this.status.ideIntegration) {
      suggestions.push('Initialize IDE integration for development hooks');
    }

    if (!this.status.cicdIntegration) {
      suggestions.push('Setup CI/CD integration for automated validation');
    }

    const cicdMetrics = cicdIntegration.getValidationMetrics();
    if (cicdMetrics.passRate < 80) {
      suggestions.push('Improve validation pass rate in CI/CD pipeline');
    }

    return suggestions;
  }

  updateConfig(config: Partial<IntegrationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ Integration Manager config updated');
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down Integration Manager...');

    if (this.status.fileWatcher) {
      fileWatcher.stopWatching();
    }

    this.isInitialized = false;
    
    console.log('✅ Integration Manager shutdown complete');
  }
}

export const integrationManager = new IntegrationManagerService();
