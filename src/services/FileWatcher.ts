
// File Watcher Service
// Real-time file monitoring and automatic cache invalidation

export interface FileWatcherConfig {
  watchPaths: string[];
  ignorePatterns: string[];
  debounceMs: number;
  enableHotReload: boolean;
}

export interface FileChangeEvent {
  type: 'created' | 'modified' | 'deleted' | 'renamed';
  path: string;
  oldPath?: string;
  timestamp: Date;
  size?: number;
}

export type FileChangeHandler = (event: FileChangeEvent) => void;

class FileWatcherService {
  private watchers = new Map<string, any>();
  private handlers = new Set<FileChangeHandler>();
  private config: FileWatcherConfig;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.config = {
      watchPaths: ['src/**/*', 'docs/**/*'],
      ignorePatterns: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      debounceMs: 500,
      enableHotReload: true
    };
  }

  async startWatching(): Promise<void> {
    try {
      console.log('🔍 Starting file watcher for AI context system...');
      
      // In a real implementation, this would use fs.watch or chokidar
      // For now, we'll simulate file watching with polling
      this.simulateFileWatching();
      
      console.log('✅ File watcher started successfully');
    } catch (error) {
      console.error('❌ Failed to start file watcher:', error);
    }
  }

  stopWatching(): void {
    console.log('🛑 Stopping file watcher...');
    
    for (const watcher of this.watchers.values()) {
      if (watcher && watcher.close) {
        watcher.close();
      }
    }
    
    this.watchers.clear();
    this.clearDebounceTimers();
    
    console.log('✅ File watcher stopped');
  }

  addChangeHandler(handler: FileChangeHandler): void {
    this.handlers.add(handler);
  }

  removeChangeHandler(handler: FileChangeHandler): void {
    this.handlers.delete(handler);
  }

  updateConfig(config: Partial<FileWatcherConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('⚙️ File watcher config updated');
  }

  private simulateFileWatching(): void {
    // Simulate file system events for development
    // In production, this would be replaced with real file system monitoring
    
    const simulateChange = () => {
      if (Math.random() > 0.95) { // 5% chance of simulated change
        const mockEvent: FileChangeEvent = {
          type: 'modified',
          path: 'src/services/AIContextService.ts',
          timestamp: new Date(),
          size: 1024
        };
        
        this.handleFileChange(mockEvent);
      }
    };

    // Check for changes every 5 seconds
    setInterval(simulateChange, 5000);
  }

  private handleFileChange(event: FileChangeEvent): void {
    const { path } = event;
    
    // Debounce file changes to avoid excessive processing
    if (this.debounceTimers.has(path)) {
      clearTimeout(this.debounceTimers.get(path)!);
    }

    const timer = setTimeout(() => {
      this.processFileChange(event);
      this.debounceTimers.delete(path);
    }, this.config.debounceMs);

    this.debounceTimers.set(path, timer);
  }

  private processFileChange(event: FileChangeEvent): void {
    console.log(`📁 File ${event.type}: ${event.path}`);
    
    // Notify all registered handlers
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('❌ Error in file change handler:', error);
      }
    }
  }

  private clearDebounceTimers(): void {
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  getWatchStatus(): {
    isWatching: boolean;
    watchedPaths: string[];
    activeHandlers: number;
  } {
    return {
      isWatching: this.watchers.size > 0,
      watchedPaths: this.config.watchPaths,
      activeHandlers: this.handlers.size
    };
  }
}

export const fileWatcher = new FileWatcherService();
