
// Database Connection Pool Manager
// Version: 1.0.0
// Phase 1.2: Enhanced Database Foundation - Connection Pooling

import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

  private healthCheckInterval?: NodeJS.Timeout;

  constructor(private config: ConnectionPoolConfig) {
    this.startHealthCheck();
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

  /**
   * Initialize the connection pool with minimum connections
   */
  async initialize(): Promise<void> {
    console.log(`🏊‍♂️ Initializing connection pool with ${this.config.minConnections} connections...`);
    
    for (let i = 0; i < this.config.minConnections; i++) {
      const client = await this.createConnection();
      this.pool.push(client);
      this.metrics.totalConnections++;
      this.metrics.idleConnections++;
    }
    
    console.log(`✅ Connection pool initialized with ${this.pool.length} connections`);
  }

  /**
   * Acquire a connection from the pool
   */
  async acquire(): Promise<SupabaseClient> {
    return new Promise((resolve, reject) => {
      // Check for available idle connection
      if (this.pool.length > 0) {
        const client = this.pool.pop()!;
        this.activeConnections.add(client);
        this.metrics.activeConnections++;
        this.metrics.idleConnections--;
        this.metrics.totalAcquired++;
        resolve(client);
        return;
      }

      // Create new connection if under max limit
      if (this.metrics.totalConnections < this.config.maxConnections) {
        this.createConnection()
          .then(client => {
            this.activeConnections.add(client);
            this.metrics.totalConnections++;
            this.metrics.activeConnections++;
            this.metrics.totalAcquired++;
            resolve(client);
          })
          .catch(reject);
        return;
      }

      // Queue request if at max connections
      this.waitingQueue.push({
        resolve,
        reject,
        timestamp: Date.now()
      });
      this.metrics.waitingRequests++;

      // Set timeout for queued request
      setTimeout(() => {
        const index = this.waitingQueue.findIndex(req => req.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          this.metrics.waitingRequests--;
          reject(new Error(`Connection acquire timeout after ${this.config.acquireTimeoutMs}ms`));
        }
      }, this.config.acquireTimeoutMs);
    });
  }

  /**
   * Release a connection back to the pool
   */
  async release(client: SupabaseClient): Promise<void> {
    if (!this.activeConnections.has(client)) {
      console.warn('⚠️ Attempting to release connection not managed by pool');
      return;
    }

    this.activeConnections.delete(client);
    this.metrics.activeConnections--;
    this.metrics.totalReleased++;

    // Serve waiting request if any
    if (this.waitingQueue.length > 0) {
      const request = this.waitingQueue.shift()!;
      this.activeConnections.add(client);
      this.metrics.activeConnections++;
      this.metrics.waitingRequests--;
      request.resolve(client);
      return;
    }

    // Return to pool if healthy
    const isHealthy = await this.isConnectionHealthy(client);
    if (isHealthy) {
      this.pool.push(client);
      this.metrics.idleConnections++;
    } else {
      // Replace unhealthy connection
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
  }

  /**
   * Get current pool metrics
   */
  getMetrics(): PoolMetrics {
    return { ...this.metrics };
  }

  /**
   * Get pool health status
   */
  getHealthStatus(): {
    healthy: boolean;
    issues: string[];
    utilization: number;
  } {
    const issues: string[] = [];
    const utilization = this.metrics.activeConnections / this.config.maxConnections;

    if (this.metrics.healthyConnections < this.config.minConnections) {
      issues.push('Below minimum healthy connections');
    }

    if (utilization > 0.8) {
      issues.push('High connection utilization (>80%)');
    }

    if (this.waitingQueue.length > 0) {
      issues.push(`${this.waitingQueue.length} requests waiting for connections`);
    }

    return {
      healthy: issues.length === 0,
      issues,
      utilization
    };
  }

  /**
   * Create a new database connection
   */
  private async createConnection(): Promise<SupabaseClient> {
    const supabaseUrl = 'https://fhzhlyskfjvcwcqjssmb.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoemhseXNrZmp2Y3djcWpzc21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgwNjIzMTksImV4cCI6MjA2MzYzODMxOX0.S2-LU5bi34Pcrg-XNEHj_SBQzxQncIe4tnOfhuyedNk';

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Pool connections don't need session persistence
        autoRefreshToken: false,
      },
      global: {
        headers: {
          'X-Client-Info': 'lovable-project-pool'
        }
      }
    });

    // Validate connection
    const isHealthy = await this.isConnectionHealthy(client);
    if (!isHealthy) {
      throw new Error('Failed to create healthy database connection');
    }

    return client;
  }

  /**
   * Check if a connection is healthy
   */
  private async isConnectionHealthy(client: SupabaseClient): Promise<boolean> {
    try {
      const { error } = await client.auth.getSession();
      this.metrics.healthyConnections++;
      return !error;
    } catch (error) {
      console.error('❌ Connection health check failed:', error);
      return false;
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(async () => {
      this.metrics.healthyConnections = 0;
      
      // Check active connections
      for (const client of this.activeConnections) {
        await this.isConnectionHealthy(client);
      }
      
      // Check idle connections
      for (const client of this.pool) {
        await this.isConnectionHealthy(client);
      }
      
      const health = this.getHealthStatus();
      if (!health.healthy) {
        console.warn('⚠️ Connection pool health issues:', health.issues);
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Cleanup and close all connections
   */
  async cleanup(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear waiting queue
    this.waitingQueue.forEach(req => {
      req.reject(new Error('Connection pool shutting down'));
    });
    this.waitingQueue.length = 0;

    // Note: Supabase connections don't need explicit cleanup
    this.pool.length = 0;
    this.activeConnections.clear();
    
    console.log('🔄 Connection pool cleanup completed');
  }
}

// Export singleton instance
export const connectionPool = DatabaseConnectionPool.getInstance();
