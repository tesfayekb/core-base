
// Enhanced Threat Detection Service - Phase 2.3
// Implements advanced security monitoring and threat pattern detection

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
}

export interface ThreatPattern {
  pattern: string;
  threshold: number;
  timeWindow: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export class ThreatDetectionService {
  private static instance: ThreatDetectionService;
  private detectionPatterns: ThreatPattern[] = [
    {
      pattern: 'failed_login_attempts',
      threshold: 5,
      timeWindow: 10,
      severity: 'medium'
    },
    {
      pattern: 'privilege_escalation_attempts',
      threshold: 3,
      timeWindow: 5,
      severity: 'high'
    },
    {
      pattern: 'unusual_data_access',
      threshold: 10,
      timeWindow: 15,
      severity: 'medium'
    },
    {
      pattern: 'cross_tenant_access_attempts',
      threshold: 1,
      timeWindow: 1,
      severity: 'critical'
    }
  ];

  private recentEvents = new Map<string, any[]>();
  private activeThreats = new Map<string, SecurityThreat>();

  static getInstance(): ThreatDetectionService {
    if (!ThreatDetectionService.instance) {
      ThreatDetectionService.instance = new ThreatDetectionService();
    }
    return ThreatDetectionService.instance;
  }

  async analyzeSecurityEvent(event: any): Promise<SecurityThreat | null> {
    const eventKey = this.generateEventKey(event);
    
    // Store recent events for pattern analysis
    if (!this.recentEvents.has(eventKey)) {
      this.recentEvents.set(eventKey, []);
    }
    
    const events = this.recentEvents.get(eventKey)!;
    events.push({
      ...event,
      timestamp: new Date().toISOString()
    });

    // Clean old events outside time window
    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes
    const filteredEvents = events.filter(e => 
      new Date(e.timestamp).getTime() > cutoffTime
    );
    this.recentEvents.set(eventKey, filteredEvents);

    // Check for threat patterns
    for (const pattern of this.detectionPatterns) {
      const threat = await this.checkThreatPattern(pattern, filteredEvents, event);
      if (threat) {
        await this.handleDetectedThreat(threat);
        return threat;
      }
    }

    return null;
  }

  private async checkThreatPattern(
    pattern: ThreatPattern, 
    events: any[], 
    currentEvent: any
  ): Promise<SecurityThreat | null> {
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
        break;

      case 'privilege_escalation_attempts':
        const privilegeEvents = recentEvents.filter(e => 
          e.action?.includes('rbac.') && e.outcome === 'failure'
        );
        patternMatch = privilegeEvents.length >= pattern.threshold;
        description = `${privilegeEvents.length} privilege escalation attempts detected`;
        indicators.push(`Escalation attempts: ${privilegeEvents.length}`);
        break;

      case 'unusual_data_access':
        const dataEvents = recentEvents.filter(e => 
          e.action?.includes('data.') && e.outcome === 'success'
        );
        patternMatch = dataEvents.length >= pattern.threshold;
        description = `${dataEvents.length} unusual data access patterns detected`;
        indicators.push(`Data access events: ${dataEvents.length}`);
        break;

      case 'cross_tenant_access_attempts':
        const crossTenantEvents = recentEvents.filter(e => 
          e.details?.crossTenantAttempt === true
        );
        patternMatch = crossTenantEvents.length >= pattern.threshold;
        description = `Cross-tenant access attempt detected`;
        indicators.push(`Cross-tenant attempts: ${crossTenantEvents.length}`);
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
        metadata: {
          pattern: pattern.pattern,
          threshold: pattern.threshold,
          actualCount: recentEvents.length,
          timeWindow: pattern.timeWindow
        }
      };
    }

    return null;
  }

  private async handleDetectedThreat(threat: SecurityThreat): Promise<void> {
    // Store the threat
    this.activeThreats.set(threat.id, threat);

    // Log security event
    await standardizedAuditLogger.logSecurityEvent(
      `threat_detected.${threat.type}`,
      threat.severity,
      {
        threatId: threat.id,
        description: threat.description,
        indicators: threat.indicators,
        outcome: 'success'
      },
      {
        userId: threat.userId,
        tenantId: threat.tenantId
      }
    );

    // Trigger real-time alerts for critical threats
    if (threat.severity === 'critical' || threat.severity === 'high') {
      await this.triggerImmediateAlert(threat);
    }
  }

  private async triggerImmediateAlert(threat: SecurityThreat): Promise<void> {
    console.warn(`🚨 SECURITY THREAT DETECTED: ${threat.type} - ${threat.severity}`);
    console.warn(`Description: ${threat.description}`);
    console.warn(`Indicators: ${threat.indicators.join(', ')}`);
    
    // In a real implementation, this would trigger notifications
    // to security teams, send emails, etc.
  }

  private generateEventKey(event: any): string {
    return `${event.userId || 'anonymous'}-${event.tenantId || 'no-tenant'}`;
  }

  private mapPatternToThreatType(pattern: string): SecurityThreat['type'] {
    switch (pattern) {
      case 'failed_login_attempts': return 'brute_force';
      case 'privilege_escalation_attempts': return 'privilege_escalation';
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
}

export const threatDetectionService = ThreatDetectionService.getInstance();
