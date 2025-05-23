
# Security Monitoring Alerting Thresholds

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document establishes standardized security monitoring thresholds, alert configurations, and response procedures across all security controls in the application. These thresholds ensure consistent detection and response to security events.

## Alerting Framework

### Alert Priority Levels

| Priority | Description | Response Time | Notification Methods | Escalation Path |
|----------|-------------|---------------|---------------------|----------------|
| P1 | Critical security event requiring immediate action | 15 minutes | SMS, Email, Phone Call, Slack | Security Team → CISO → CTO |
| P2 | High-severity security event requiring prompt action | 1 hour | SMS, Email, Slack | Security Team → Security Lead |
| P3 | Medium-severity security event requiring attention | 8 hours | Email, Slack | Security Team |
| P4 | Low-severity security event requiring evaluation | 24 hours | Email, Ticket | Security Analyst |
| P5 | Informational security event | None | Dashboard | None |

### Alert Categorization

1. **Authentication Alerts**
   - Failed login attempts
   - Account lockouts
   - Password reset activity
   - Unusual authentication patterns

2. **Authorization Alerts**
   - Permission violations
   - Privilege escalation attempts
   - Unusual resource access
   - Cross-tenant access attempts

3. **Data Protection Alerts**
   - Sensitive data access
   - Unusual data export activity
   - Encryption failures
   - Data integrity issues

4. **Infrastructure Security Alerts**
   - Configuration changes
   - Vulnerability detections
   - Patch failures
   - System resource anomalies

5. **Application Security Alerts**
   - Input validation failures
   - Rate limit violations
   - API abuse
   - Injection attempts

## Authentication Monitoring Thresholds

### Failed Login Attempts

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| 5 | P4 | 10 minutes | Same username | Potential password guessing for user {username} | Log only |
| 10 | P3 | 10 minutes | Same username | Multiple failed logins for user {username} | Auto-lock account temporarily |
| 20 | P3 | 10 minutes | Same IP address | Multiple failed logins from IP {ip_address} | Rate limit IP |
| 50 | P2 | 30 minutes | Same IP address | Potential brute force attack from IP {ip_address} | Block IP for 24 hours |
| 100 | P2 | 60 minutes | System-wide | Unusual authentication failure rate detected | Security team investigation |
| 500 | P1 | 60 minutes | System-wide | Potential distributed brute force attack | Implement captcha, additional monitoring |

### Unusual Authentication Patterns

| Threshold | Priority | Condition | Alert Message | Response |
|-----------|----------|-----------|---------------|----------|
| Geolocation | P3 | Login from new country | New geographic login for user {username} from {country} | Step-up authentication |
| Time Pattern | P3 | Login outside normal hours (>3 std dev) | Unusual time login for user {username} at {time} | Security review |
| Device Change | P4 | New device for user | New device login for user {username} | In-app notification |
| Concurrent Sessions | P3 | >3 active sessions | Multiple concurrent sessions for user {username} | User notification |
| Admin Login | P3 | Admin login from new location | Admin login from new location for user {username} | Security review |
| VIP Account | P2 | Unusual access pattern for VIP | VIP account unusual access for user {username} | Immediate review |

## Authorization Monitoring Thresholds

### Permission Violations

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| 3 | P4 | 5 minutes | Same user | User {username} attempted unauthorized access | Security review |
| 10 | P3 | 10 minutes | Same user | Multiple unauthorized access attempts by user {username} | Temporary session termination |
| 20 | P2 | 30 minutes | Same IP address | Potential permission probing from IP {ip_address} | Block IP for investigation |
| 50 | P2 | 60 minutes | System-wide | Elevated unauthorized access attempts | Security team investigation |

### Privilege Escalation

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| 1 | P2 | Immediate | Admin privilege gain | User {username} gained admin privileges | Verify authorization |
| 3 | P1 | 24 hours | Role escalation | User {username} role escalated multiple times | Security investigation |
| 1 | P1 | Immediate | Unauthorized permission change | Unauthorized permission change for user {username} | Lock account, investigation |

### Multi-tenant Violations

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| 1 | P2 | Immediate | Cross-tenant data access | Cross-tenant data access by user {username} | Security investigation |
| 3 | P2 | 60 minutes | Cross-tenant attempts | Multiple cross-tenant access attempts by user {username} | Lock account, investigation |
| 10 | P1 | 24 hours | System-wide | Unusual cross-tenant access pattern detected | Full security review |

## Data Protection Alerting Thresholds

### Sensitive Data Access

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Volume | P3 | >100 records | Single query retrieving large volume | Large data access by user {username} | Security review |
| Frequency | P3 | >20 queries in 10 minutes | High-frequency sensitive data access | High-frequency data access by user {username} | Security review |
| Time | P3 | Off-hours access | Sensitive data access outside business hours | Off-hours data access by user {username} | Security review |
| Pattern | P2 | Unusual access pattern | Access pattern deviating from baseline | Unusual data access pattern by user {username} | Security investigation |

### Data Export Activities

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Volume | P2 | >1000 records | Bulk export of sensitive data | Large data export by user {username} | Security review |
| Frequency | P2 | >5 exports in 24 hours | Multiple export operations | Multiple exports by user {username} | Security review |
| First Time | P3 | New behavior | First time user performs export | First-time export by user {username} | Security review |
| Night Export | P2 | 8PM - 6AM local time | Export during non-business hours | Off-hours export by user {username} | Security investigation |

## System Integrity Alerting Thresholds

### Configuration Changes

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Security Settings | P2 | Immediate | Change to security settings | Security settings modified by user {username} | Verification required |
| Auth Config | P1 | Immediate | Change to auth configuration | Auth configuration modified by user {username} | Security review |
| Permission Scheme | P2 | Immediate | Change to permission scheme | Permission scheme modified by user {username} | Security review |
| Logging Config | P1 | Immediate | Change to logging settings | Logging configuration modified by user {username} | Security investigation |

### System Resource Anomalies

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| CPU | P3 | >90% for 15 minutes | Sustained high CPU | System under high CPU load | Performance investigation |
| Memory | P3 | >90% for 15 minutes | Sustained high memory | System under high memory pressure | Performance investigation |
| Disk | P2 | >90% capacity | Near disk capacity | System approaching storage limit | Capacity planning |
| Connections | P2 | >90% connection pool | Near connection limit | System approaching connection limit | Performance investigation |

## Application Security Alerting Thresholds

### Input Validation Failures

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| 10 | P4 | 5 minutes | Same user | Multiple input validation failures for user {username} | Security review |
| 50 | P3 | 10 minutes | Same IP | Multiple input validation failures from IP {ip_address} | Rate limiting |
| 100 | P2 | 30 minutes | System-wide | Elevated input validation failure rate | Security investigation |
| XSS Pattern | P2 | Immediate | XSS payload detected | XSS attempt from IP {ip_address} | Block IP, investigation |
| SQL Pattern | P1 | Immediate | SQL injection pattern | SQL injection attempt from IP {ip_address} | Block IP, immediate investigation |

### Rate Limit Violations

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| 10 | P4 | 5 minutes | Same user | Rate limit exceeded for user {username} | Monitor |
| 50 | P3 | 10 minutes | Same IP | Rate limit exceeded for IP {ip_address} | Temporary IP block |
| 100 | P2 | 30 minutes | System-wide | Elevated rate limit violations | Security investigation |
| 500 | P1 | 60 minutes | System-wide | Potential DoS attack | Enable additional protections |

### API Abuse Detection

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Pattern | P3 | API scanning pattern | Sequential resource access | API scanning detected from IP {ip_address} | Rate limiting |
| Error Rate | P3 | >50% error rate | High API error rate | High API error rate from IP {ip_address} | Investigation |
| Volume | P2 | >1000 requests in 1 minute | High volume from single source | High API volume from IP {ip_address} | Rate limiting |
| Distribution | P1 | Distributed attack pattern | Coordinated API requests | Potential distributed API abuse | Advanced protections |

## Security Operational Alerting Thresholds

### Security Service Health

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Auth Service | P1 | >5 minutes | Authentication service degraded | Authentication service degradation | Incident response |
| Permission Service | P1 | >5 minutes | Permission service degraded | Permission service degradation | Incident response |
| Monitoring | P1 | >5 minutes | Security monitoring degraded | Security monitoring degradation | Incident response |
| Log Collection | P2 | >15 minutes | Log collection degraded | Log collection degradation | Investigation |

### Security Compliance

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Audit Gaps | P2 | >30 minutes | Gap in audit trail | Audit logging gap detected | Compliance investigation |
| Cert Expiry | P2 | <30 days | Certificate approaching expiry | Certificate expiring soon | Certificate renewal |
| Policy Violation | P2 | Immediate | Security policy violation | Security policy violation detected | Compliance review |
| Access Review | P3 | >90 days | Overdue access review | Access review overdue | Schedule review |

## Advanced Threat Detection Thresholds

### Behavioral Anomalies

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| User Behavior | P2 | Deviation from baseline | User activity outside normal pattern | Unusual user behavior for {username} | Security review |
| System Pattern | P2 | Deviation from baseline | System activity outside normal pattern | Unusual system behavior detected | Security review |
| Data Access | P2 | Deviation from baseline | Data access outside normal pattern | Unusual data access pattern detected | Security review |
| API Usage | P3 | Deviation from baseline | API usage outside normal pattern | Unusual API usage pattern detected | Security review |

### Threat Intelligence Integration

| Threshold | Priority | Time Window | Condition | Alert Message | Response |
|-----------|----------|-------------|-----------|---------------|----------|
| Known Attacker | P1 | Immediate | Access from known malicious IP | Access from known malicious IP {ip_address} | Block IP, investigation |
| Threat Campaign | P2 | Immediate | Pattern matching active campaign | Potential threat campaign activity detected | Enhanced monitoring |
| Malware Indicators | P1 | Immediate | Indicators of compromise detected | Potential malware activity detected | Security investigation |
| Suspicious Domain | P2 | Immediate | Communication with suspicious domain | Communication with suspicious domain {domain} | Network investigation |

## Correlation Rules

### Complex Event Detection

1. **Account Takeover Detection**
   - Password change + email change + security settings change within 1 hour
   - Priority: P1
   - Response: Account lockdown, security investigation

2. **Data Exfiltration Pattern**
   - Large data query + export activity + off-hours access
   - Priority: P1
   - Response: User session termination, security investigation  

3. **Privilege Abuse Pattern**
   - New admin account creation + permission changes + unusual system access
   - Priority: P1
   - Response: System protection mode, security investigation

4. **Infrastructure Attack Pattern** 
   - Multiple authentication failures + configuration probing + rate limit violations
   - Priority: P1
   - Response: Enhanced security posture, security investigation

## Alert Suppression and Tuning

### Suppression Rules

1. **Maintenance Window**
   - During scheduled maintenance windows
   - Suppress all P3-P5 alerts
   - Conditional suppression of P2 alerts
   - Never suppress P1 alerts

2. **Testing Environments**
   - In designated testing environments
   - Suppress alerts based on environment tag
   - Separate alerting thresholds for test environments

3. **Known Issues**
   - For documented known issues
   - Time-limited suppression with expiration
   - Mandatory review of suppression rules

### False Positive Reduction

1. **Alert Tuning Process**
   - Regular review of alert firing patterns
   - Statistical analysis of alert accuracy
   - Threshold adjustment based on data
   - Machine learning for dynamic thresholds

2. **Alert Correlation**
   - Reduce individual alerts via correlation
   - Context-enriched alert generation
   - Automated root cause analysis
   - Single alert for related events

## Response Automation

### Automated Response Actions

1. **Authentication Protection**
   - Auto-lock accounts after threshold violations
   - Implement captcha after suspicious patterns
   - Step-up authentication requirements
   - IP blocking for brute force attempts

2. **System Protection**
   - Automatic traffic throttling
   - Dynamic firewall rule adjustment
   - Temporary service isolation
   - Automatic backup snapshot creation

3. **Threat Containment**
   - Session termination for compromised accounts
   - Automatic malicious IP blocking
   - Temporary feature restriction
   - Isolation of affected components

## Alert Notification Matrix

| Role | P1 Alerts | P2 Alerts | P3 Alerts | P4 Alerts | P5 Alerts |
|------|-----------|-----------|-----------|-----------|-----------|
| Security Analyst | SMS, Email, Slack | Email, Slack | Email, Slack | Email | Dashboard |
| Security Lead | SMS, Email, Slack | Email, Slack | Email | Dashboard | None |
| CISO | SMS, Email | Email | Daily Summary | Weekly Summary | None |
| CTO | SMS (after hours only) | Daily Summary | Weekly Summary | None | None |
| Compliance | Email | Email | Weekly Summary | Monthly Report | None |
| Development Lead | Relevant P1s | Relevant P2s | None | None | None |

## Integration with Error Handling

Security alerting integrates with the error handling framework as defined in [ERROR_HANDLING.md](ERROR_HANDLING.md):

1. **Error to Alert Mapping**
   - Critical errors generate security alerts
   - Error patterns trigger threshold evaluations
   - Error clustering for alert reduction

2. **Context Preservation**
   - Error context used in alert enrichment
   - Trace IDs linked between errors and alerts
   - Error chain visualization in alert details

## Related Documentation

- **[SECURITY_MONITORING.md](SECURITY_MONITORING.md)**: Security monitoring architecture
- **[ERROR_HANDLING.md](ERROR_HANDLING.md)**: Error handling standards
- **[../audit/LOG_FORMAT_STANDARDIZATION.md](../audit/LOG_FORMAT_STANDARDIZATION.md)**: Audit log format
- **[../implementation/monitoring/ALERT_MANAGEMENT.md](../implementation/monitoring/ALERT_MANAGEMENT.md)**: Alert management
- **[../implementation/monitoring/INCIDENT_RESPONSE.md](../implementation/monitoring/INCIDENT_RESPONSE.md)**: Incident response

## Version History

- **1.0.0**: Initial security alerting thresholds document (2025-05-23)
