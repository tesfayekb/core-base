
// Audit Event Queue - Handles asynchronous event processing
// Part of Enhanced Audit Service refactoring

import { auditService } from '../database/auditService';

export interface AuditEvent {
  eventType: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  userId?: string;
  tenantId?: string;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  outcome: 'success' | 'failure' | 'error';
}

export class AuditEventQueue {
  private static instance: AuditEventQueue;
  private eventQueue: AuditEvent[] = [];
  private isProcessing = false;

  static getInstance(): AuditEventQueue {
    if (!AuditEventQueue.instance) {
      AuditEventQueue.instance = new AuditEventQueue();
    }
    return AuditEventQueue.instance;
  }

  async queueEvent(event: AuditEvent): Promise<void> {
    this.eventQueue.push(event);
    
    // Process queue asynchronously to minimize performance impact
    if (!this.isProcessing) {
      setTimeout(() => this.processQueue(), 0);
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Process events in batches for better performance
      const batchSize = 10;
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, batchSize);
        
        await Promise.all(
          batch.map(event => this.logEventToDatabase(event))
        );
      }
    } catch (error) {
      console.error('Error processing audit queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async logEventToDatabase(event: AuditEvent): Promise<void> {
    try {
      await auditService.logEvent(
        event.eventType,
        event.action,
        event.resourceType,
        event.resourceId,
        event.details || {},
        event.ipAddress,
        event.userAgent
      );
    } catch (error) {
      console.error('Failed to log audit event:', error);
    }
  }

  async flush(): Promise<void> {
    if (this.eventQueue.length > 0) {
      await this.processQueue();
    }
  }
}

export const auditEventQueue = AuditEventQueue.getInstance();
