
// Enhanced Threat Detection Service - Security Integration Optimization
// Addresses edge cases and improves cross-system integration

import { standardizedAuditLogger } from '../audit/StandardizedAuditLogger';
import { realTimeAuditMonitor } from '../audit/RealTimeAuditMonitor';

export interface SecurityThreat {
  id: string;
  type: 'brute_force' | 'privilege_escalation' | 'data_exfiltration' | 'suspicious_access' | 'anomalous_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  timestamp: string;
  userId?: string;
  tenantId?: string;
  metadata: Record<string, any>;
  correlationId?: string;
  sessionId?: string;
}

export interface ThreatPattern {
  pattern: string;
  threshold: number;
  timeWindow: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export class EnhancedThreatDetectionService {
  private static instance: EnhancedThreatDetectionService;
  private detectionPatterns: ThreatPattern[] = [
    {
      pattern: 'failed_login_attempts',
      threshold: 5,
      timeWindow: 10,
      severity: 'medium',
      enabled: true
    },
    {
      pattern: 'privilege_escalation_attempts',
      threshold: 3,
      timeWindow: 5,
      severity: 'high',
      enabled: true
    },
    {
      pattern: 'unusual_data_access',
      threshold: 10,
      timeWindow: 15,
      severity: 'medium',
      enabled: true
    },
    {
      pattern: 'cross_tenant_access_attempts',
      threshold: 1,
      timeWindow: 1,
      severity: 'critical',
      enabled: true
    },
    {
      pattern: 'rapid_permission_changes',
      threshold: 5,
      timeWindow: 5,
      severity: 'high',
      enabled: true
    }
  ];

  private recentEvents = new Map<string, any[]>();
  private activeThreats = new Map<string, SecurityThreat>();
  private eventCorrelation = new Map<string, string[]>();
  private isHealthy = true;
  private lastHealthCheck = Date.now();

  static getInstance(): EnhancedThreatDetectionService {
    if (!EnhancedThreatDetectionService.instance) {
      EnhancedThreatDetectionService.instance = new EnhancedThreatDetectionService();
    }
    return EnhancedThreatDetectionService.instance;
  }

  async analyzeSecurityEvent(event: any): Promise<SecurityThreat | null> {
    try {
      // Health check and circuit breaker
      if (!this.isHealthy) {
        await this.performHealthCheck();
        if (!this.isHealthy) {
          console.warn('Threat detection service unhealthy, skipping analysis');
          return null;
        }
      }

      const eventKey = this.generateEventKey(event);
      const correlationId = event.correlationId || event.requestId || crypto.randomUUID();
      
      // Enhanced event correlation
      this.correlateEvent(correlationId, event);
      
      // Store recent events with better memory management
      this.storeRecentEvent(eventKey, event, correlationId);

      // Clean old events efficiently
      this.cleanupOldEvents();

      // Check for threat patterns with enhanced logic
      for (const pattern of this.detectionPatterns.filter(p => p.enabled)) {
        const threat = await this.checkThreatPatternEnhanced(pattern, eventKey, event, correlationId);
        if (threat) {
          await this.handleDetectedThreatEnhanced(threat);
          return threat;
        }
      }

      return null;
    } catch (error) {
      console.error('Error in threat analysis:', error);
      await this.logSecurityError('threat_analysis_error', error, event);
      return null;
    }
  }

  private correlateEvent(correlationId: string, event: any): void {
    if (!this.eventCorrelation.has(correlationId)) {
      this.eventCorrelation.set(correlationId, []);
    }
    
    const correlatedEvents = this.eventCorrelation.get(correlationId)!;
    correlatedEvents.push(event.id || event.timestamp);
    
    // Limit correlation history
    if (correlatedEvents.length > 50) {
      correlatedEvents.splice(0, correlatedEvents.length - 50);
    }
  }

  private storeRecentEvent(eventKey: string, event: any, correlationId: string): void {
    if (!this.recentEvents.has(eventKey)) {
      this.recentEvents.set(eventKey, []);
    }
    
    const events = this.recentEvents.get(eventKey)!;
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
      correlationId
    });

    // Limit memory usage per event key
    if (events.length > 100) {
      events.splice(0, events.length - 100);
    }
  }

  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (60 * 60 * 1000); // 1 hour
    
    for (const [key, events] of this.recentEvents.entries()) {
      const filteredEvents = events.filter(e => 
        new Date(e.timestamp).getTime() > cutoffTime
      );
      
      if (filteredEvents.length === 0) {
        this.recentEvents.delete(key);
      } else {
        this.recentEvents.set(key, filteredEvents);
      }
    }

    // Cleanup correlation data
    for (const [correlationId, events] of this.eventCorrelation.entries()) {
      if (events.length === 0) {
        this.eventCorrelation.delete(correlationId);
      }
    }
  }

  private async checkThreatPatternEnhanced(
    pattern: ThreatPattern, 
    eventKey: string,
    currentEvent: any,
    correlationId: string
  ): Promise<SecurityThreat | null> {
    try {
      const events = this.recentEvents.get(eventKey) || [];
      const windowStart = Date.now() - (pattern.timeWindow * 60 * 1000);
      const recentEvents = events.filter(e => 
        new Date(e.timestamp).getTime() > windowStart
      );

      let patternMatch = false;
      let description = '';
      const indicators: string[] = [];

      switch (pattern.pattern) {
        case 'failed_login_attempts':
          const failedLogins = recentEvents.filter(e => 
            e.action?.includes('auth.login') && e.outcome === 'failure'
          );
          patternMatch = failedLogins.length >= pattern.threshold;
          description = `${failedLogins.length} failed login attempts detected`;
          indicators.push(`Failed attempts: ${failedLogins.length}`);
          indicators.push(`Time window: ${pattern.timeWindow} minutes`);
          break;

        case 'privilege_escalation_attempts':
          const privilegeEvents = recentEvents.filter(e => 
            e.action?.includes('rbac.') && (e.outcome === 'failure' || e.details?.privilegeEscalation)
          );
          patternMatch = privilegeEvents.length >= pattern.threshold;
          description = `${privilegeEvents.length} privilege escalation attempts detected`;
          indicators.push(`Escalation attempts: ${privilegeEvents.length}`);
          break;

        case 'unusual_data_access':
          const dataEvents = recentEvents.filter(e => 
            e.action?.includes('data.') && e.outcome === 'success'
          );
          const uniqueResources = new Set(dataEvents.map(e => e.resourceId)).size;
          patternMatch = dataEvents.length >= pattern.threshold || uniqueResources > 20;
          description = `Unusual data access: ${dataEvents.length} operations, ${uniqueResources} resources`;
          indicators.push(`Data access events: ${dataEvents.length}`);
          indicators.push(`Unique resources: ${uniqueResources}`);
          break;

        case 'cross_tenant_access_attempts':
          const crossTenantEvents = recentEvents.filter(e => 
            e.details?.crossTenantAttempt === true || 
            (e.tenantId && currentEvent.tenantId && e.tenantId !== currentEvent.tenantId)
          );
          patternMatch = crossTenantEvents.length >= pattern.threshold;
          description = `Cross-tenant access attempt detected`;
          indicators.push(`Cross-tenant attempts: ${crossTenantEvents.length}`);
          break;

        case 'rapid_permission_changes':
          const permissionEvents = recentEvents.filter(e => 
            e.action?.includes('rbac.permission') || e.action?.includes('rbac.role')
          );
          patternMatch = permissionEvents.length >= pattern.threshold;
          description = `Rapid permission changes detected: ${permissionEvents.length} changes`;
          indicators.push(`Permission changes: ${permissionEvents.length}`);
          break;
      }

      if (patternMatch) {
        return {
          id: crypto.randomUUID(),
          type: this.mapPatternToThreatType(pattern.pattern),
          severity: pattern.severity,
          description,
          indicators,
          timestamp: new Date().toISOString(),
          userId: currentEvent.userId,
          tenantId: currentEvent.tenantId,
          correlationId,
          sessionId: currentEvent.sessionId,
          metadata: {
            pattern: pattern.pattern,
            threshold: pattern.threshold,
            actualCount: recentEvents.length,
            timeWindow: pattern.timeWindow,
            correlatedEvents: this.eventCorrelation.get(correlationId) || []
          }
        };
      }

      return null;
    } catch (error) {
      console.error('Error in pattern checking:', error);
      await this.logSecurityError('pattern_check_error', error, currentEvent);
      return null;
    }
  }

  private async handleDetectedThreatEnhanced(threat: SecurityThreat): Promise<void> {
    try {
      // Store the threat
      this.activeThreats.set(threat.id, threat);

      // Enhanced audit logging with correlation
      await standardizedAuditLogger.logSecurityEvent(
        `threat_detected.${threat.type}`,
        threat.severity,
        {
          threatId: threat.id,
          description: threat.description,
          indicators: threat.indicators,
          correlationId: threat.correlationId,
          sessionId: threat.sessionId,
          outcome: 'success'
        },
        {
          userId: threat.userId,
          tenantId: threat.tenantId
        }
      );

      // Trigger real-time alerts with enhanced context
      if (threat.severity === 'critical' || threat.severity === 'high') {
        await this.triggerImmediateAlertEnhanced(threat);
      }

      // Update threat correlation
      if (threat.correlationId) {
        const correlatedEvents = this.eventCorrelation.get(threat.correlationId) || [];
        correlatedEvents.push(`threat:${threat.id}`);
        this.eventCorrelation.set(threat.correlationId, correlatedEvents);
      }

    } catch (error) {
      console.error('Error handling detected threat:', error);
      await this.logSecurityError('threat_handling_error', error, threat);
    }
  }

  private async triggerImmediateAlertEnhanced(threat: SecurityThreat): Promise<void> {
    try {
      console.warn(`🚨 SECURITY THREAT DETECTED: ${threat.type} - ${threat.severity}`);
      console.warn(`Description: ${threat.description}`);
      console.warn(`Indicators: ${threat.indicators.join(', ')}`);
      console.warn(`Correlation ID: ${threat.correlationId}`);
      
      // Enhanced threat context
      const correlatedEvents = threat.metadata.correlatedEvents || [];
      if (correlatedEvents.length > 0) {
        console.warn(`Correlated Events: ${correlatedEvents.length} related events`);
      }

      // Log critical alert
      await standardizedAuditLogger.logSecurityEvent(
        'security_alert.immediate',
        'critical',
        {
          alertType: 'immediate',
          threatId: threat.id,
          threatType: threat.type,
          severity: threat.severity,
          correlationId: threat.correlationId,
          outcome: 'success'
        },
        {
          userId: threat.userId,
          tenantId: threat.tenantId
        }
      );

    } catch (error) {
      console.error('Error triggering immediate alert:', error);
    }
  }

  private async logSecurityError(errorType: string, error: any, context: any): Promise<void> {
    try {
      await standardizedAuditLogger.logSecurityEvent(
        `security_error.${errorType}`,
        'medium',
        {
          error: error?.message || 'Unknown error',
          context: JSON.stringify(context),
          outcome: 'error'
        },
        {
          userId: context?.userId,
          tenantId: context?.tenantId
        }
      );
    } catch (logError) {
      console.error('Failed to log security error:', logError);
    }
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const now = Date.now();
      
      // Check if enough time has passed since last health check
      if (now - this.lastHealthCheck < 30000) { // 30 seconds
        return;
      }

      this.lastHealthCheck = now;

      // Check memory usage
      const eventCount = Array.from(this.recentEvents.values()).reduce((sum, events) => sum + events.length, 0);
      const memoryHealthy = eventCount < 10000; // Max 10k events in memory

      // Check correlation map size
      const correlationHealthy = this.eventCorrelation.size < 5000; // Max 5k correlations

      this.isHealthy = memoryHealthy && correlationHealthy;

      if (!this.isHealthy) {
        console.warn('Threat detection service health check failed');
        // Aggressive cleanup
        this.cleanupOldEvents();
        
        // If still unhealthy, clear half the data
        if (!memoryHealthy) {
          for (const [key, events] of this.recentEvents.entries()) {
            this.recentEvents.set(key, events.slice(-50)); // Keep only last 50 events per key
          }
        }
      }

    } catch (error) {
      console.error('Health check failed:', error);
      this.isHealthy = false;
    }
  }

  private generateEventKey(event: any): string {
    return `${event.userId || 'anonymous'}-${event.tenantId || 'no-tenant'}`;
  }

  private mapPatternToThreatType(pattern: string): SecurityThreat['type'] {
    switch (pattern) {
      case 'failed_login_attempts': return 'brute_force';
      case 'privilege_escalation_attempts': return 'privilege_escalation';
      case 'rapid_permission_changes': return 'privilege_escalation';
      case 'unusual_data_access': return 'data_exfiltration';
      case 'cross_tenant_access_attempts': return 'suspicious_access';
      default: return 'anomalous_behavior';
    }
  }

  getActiveThreats(tenantId?: string): SecurityThreat[] {
    const threats = Array.from(this.activeThreats.values());
    return tenantId ? threats.filter(t => t.tenantId === tenantId) : threats;
  }

  acknowledgeeThreat(threatId: string): boolean {
    return this.activeThreats.delete(threatId);
  }

  getHealthStatus(): { healthy: boolean; eventCount: number; correlationCount: number } {
    const eventCount = Array.from(this.recentEvents.values()).reduce((sum, events) => sum + events.length, 0);
    return {
      healthy: this.isHealthy,
      eventCount,
      correlationCount: this.eventCorrelation.size
    };
  }
}

export const enhancedThreatDetectionService = EnhancedThreatDetectionService.getInstance();
