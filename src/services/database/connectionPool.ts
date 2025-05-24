// Database Connection Pool Manager - Refactored
// Version: 3.0.0
// Phase 1.2: Enhanced Database Foundation - Code Quality Refinement

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PoolHealthMonitor } from './connectionPool/PoolHealthMonitor';

export interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  healthCheckIntervalMs: number;
}

export interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalAcquired: number;
  totalReleased: number;
  healthyConnections: number;
}

export class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private pool: SupabaseClient[] = [];
  private activeConnections = new Set<SupabaseClient>();
  private waitingQueue: Array<{
    resolve: (client: SupabaseClient) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private metrics: PoolMetrics = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalAcquired: 0,
    totalReleased: 0,
    healthyConnections: 0
  };

  private healthMonitor: PoolHealthMonitor;

  constructor(private config: ConnectionPoolConfig) {
    this.healthMonitor = new PoolHealthMonitor();
  }

  static getInstance(config?: ConnectionPoolConfig): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      const defaultConfig: ConnectionPoolConfig = {
        maxConnections: 10,
        minConnections: 2,
        acquireTimeoutMs: 5000,
        idleTimeoutMs: 300000, // 5 minutes
        healthCheckIntervalMs: 60000 // 1 minute
      };
      DatabaseConnectionPool.instance = new DatabaseConnectionPool(config || defaultConfig);
    }
    return DatabaseConnectionPool.instance;
  }

  async initialize(): Promise<void> {
    console.log(`🏊‍♂️ Initializing connection pool with ${this.config.minConnections} connections...`);
    
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = await this.createConnection();
      this.pool.push(client);
      this.metrics.totalConnections++;
      this.metrics.idleConnections++;
    }
    
    this.healthMonitor.startHealthCheck(
      this.activeConnections,
      this.pool,
      this.config.healthCheckIntervalMs
    );
    
    console.log(`✅ Connection pool initialized with ${this.pool.length} connections`);
  }

  async acquire(): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      if (this.pool.length > 0) {
        const client = this.pool.pop()!;
        this.activeConnections.add(client);
        this.updateMetricsOnAcquire();
        resolve(client);
        return;
      }

      if (this.metrics.totalConnections < this.config.maxConnections) {
        this.createConnection()
          .then(client => {
            this.activeConnections.add(client);
            this.updateMetricsOnNewConnection();
            resolve(client);
          })
          .catch(reject);
        return;
      }

      this.queueRequest(resolve, reject);
    });
  }

  async release(client: SupabaseClient): Promise<void> {
    if (!this.activeConnections.has(client)) {
      console.warn('⚠️ Attempting to release connection not managed by pool');
      return;
    }

    this.activeConnections.delete(client);
    this.updateMetricsOnRelease();

    if (this.waitingQueue.length > 0) {
      const request = this.waitingQueue.shift()!;
      this.activeConnections.add(client);
      this.metrics.activeConnections++;
      this.metrics.waitingRequests--;
      request.resolve(client);
      return;
    }

    const isHealthy = await this.healthMonitor.checkConnectionHealth(client);
    if (isHealthy) {
      this.pool.push(client);
      this.metrics.idleConnections++;
    } else {
      await this.replaceUnhealthyConnection();
    }
  }

  private updateMetricsOnAcquire(): void {
    this.metrics.activeConnections++;
    this.metrics.idleConnections--;
    this.metrics.totalAcquired++;
  }

  private updateMetricsOnNewConnection(): void {
    this.metrics.totalConnections++;
    this.metrics.activeConnections++;
    this.metrics.totalAcquired++;
  }

  private updateMetricsOnRelease(): void {
    this.metrics.activeConnections--;
    this.metrics.totalReleased++;
  }

  private queueRequest(
    resolve: (client: SupabaseClient) => void,
    reject: (error: Error) => void
  ): void {
    this.waitingQueue.push({ resolve, reject, timestamp: Date.now() });
    this.metrics.waitingRequests++;

    setTimeout(() => {
      const index = this.waitingQueue.findIndex(req => req.resolve === resolve);
      if (index !== -1) {
        this.waitingQueue.splice(index, 1);
        this.metrics.waitingRequests--;
        reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`));
      }
    }, this.config.acquireTimeoutMs);
  }

  private async replaceUnhealthyConnection(): Promise<void> {
    this.metrics.totalConnections--;
    try {
      const newClient = await this.createConnection();
      this.pool.push(newClient);
      this.metrics.totalConnections++;
      this.metrics.idleConnections++;
    } catch (error) {
      console.error('❌ Failed to replace unhealthy connection:', error);
    }
  }

  getMetrics(): PoolMetrics {
    const healthMetrics = this.healthMonitor.getMetrics();
    return { 
      ...this.metrics,
      healthyConnections: healthMetrics.healthyConnections
    };
  }

  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    utilization: number;
  } {
    return this.healthMonitor.getHealthStatus(
      this.metrics.activeConnections,
      this.config.maxConnections,
      this.config.minConnections,
      this.waitingQueue.length
    );
  }

  private async createConnection(): Promise<SupabaseClient> {
    const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'lovable-project-pool'
        }
      }
    });

    const isHealthy = await this.healthMonitor.checkConnectionHealth(client);
    if (!isHealthy) {
      throw new Error('Failed to create healthy database connection');
    }

    return client;
  }

  async cleanup(): Promise<void> {
    this.healthMonitor.stopHealthCheck();

    this.waitingQueue.forEach(req => {
      req.reject(new Error('Connection pool shutting down'));
    });
    this.waitingQueue.length = 0;

    this.pool.length = 0;
    this.activeConnections.clear();
    
    console.log('🔄 Connection pool cleanup completed');
  }
}

export const connectionPool = DatabaseConnectionPool.getInstance();
