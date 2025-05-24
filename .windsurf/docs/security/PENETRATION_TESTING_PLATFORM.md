
# Platform-Specific Penetration Testing Guidelines

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides detailed, platform-specific penetration testing guidelines that supplement the general penetration testing procedures in [PENETRATION_TESTING.md](src/docs/security/PENETRATION_TESTING.md).

## Web Application Penetration Testing

### Frontend Security Testing

1. **JavaScript Security**
   - **XSS Vector Testing**:
     - Test all input fields with payloads: `<script>alert(document.domain)</script>`
     - Test DOM-based XSS: `location.hash` manipulation
     - Test template injection: `${alert(1)}`
     - Test JSON injection in UI rendering
   - **Framework-Specific Vectors**:
     - React: Test for dangerous use of `dangerouslySetInnerHTML`
     - Test for prop drilling security issues
     - Test component boundary protection

2. **Local Storage Security**
   - **Data Leakage Testing**:
     - Inspect local storage for sensitive data
     - Test persistence after logout
     - Check for token exposure
   - **Third-Party Access**:
     - Test iframe access restrictions
     - Test cross-origin protections
     - Verify subresource integrity for externally loaded assets

3. **UI Redressing Tests**
   - Test for clickjacking vulnerabilities
   - Test frame busting effectiveness
   - Test UI deception vectors

### API Security Testing

1. **REST API Testing**
   - **Endpoint Testing Matrix**:
     | Test Type | GET | POST | PUT | DELETE |
     |-----------|-----|------|-----|--------|
     | Auth Bypass | ✓ | ✓ | ✓ | ✓ |
     | IDOR | ✓ | ✓ | ✓ | ✓ |
     | SQL Injection | ✓ | ✓ | ✓ | ✓ |
     | Rate Limiting | ✓ | ✓ | ✓ | ✓ |
   - **HTTP Method Testing**:
     - Test HEAD, OPTIONS for information disclosure
     - Test HTTP method override techniques
     - Test non-standard methods

2. **GraphQL Security Testing**
   - **Query Testing**:
     - Introspection query attacks
     - Field suggestion attacks
     - Nested query depth attacks
     - Circular fragment attacks
   - **Batch Query Testing**:
     - Test query batching limits
     - Test alias enumeration
     - Test directive manipulation

## Mobile Application Penetration Testing

### Android-Specific Testing

1. **Application Package Testing**
   - **APK Analysis**:
     - Decompile and inspect manifest permissions
     - Check for debug flags and backup settings
     - Analyze exported activities and content providers
     - Test deeplink URL handling security
   - **Binary Protection**:
     - Test root detection bypass
     - Test SSL pinning bypass
     - Test code obfuscation effectiveness
     - Test anti-tampering controls

2. **Android Storage Security**
   - **Storage Testing**:
     - Test shared preferences security
     - Test SQLite database encryption
     - Test external storage usage
     - Test file permission settings
   - **KeyStore Testing**:
     - Test Android KeyStore implementation
     - Test key protection levels
     - Test biometric authentication integration

3. **Android IPC Testing**
   - Test intent hijacking vulnerabilities
   - Test content provider access control
   - Test broadcast receiver security

### iOS-Specific Testing

1. **Application Binary Testing**
   - **IPA Analysis**:
     - Analyze Info.plist for security settings
     - Check for app transport security settings
     - Test URL scheme handling security
     - Test app extension security
   - **Binary Protection**:
     - Test jailbreak detection bypass
     - Test SSL pinning implementation
     - Test code signature verification
     - Test app notarization controls

2. **iOS Storage Security**
   - **Storage Testing**:
     - Test app sandbox isolation
     - Test keychain storage security
     - Test Core Data encryption
     - Test NSUserDefaults security
   - **Keychain Testing**:
     - Test keychain attribute security
     - Test keychain access groups
     - Test keychain data protection classes

3. **iOS App Extension Testing**
   - Test app extension communication security
   - Test shared container security
   - Test widget security

## Browser Extension Testing

1. **Extension Permission Testing**
   - Test permission scope minimization
   - Test permission abuse scenarios
   - Test permission escalation vectors

2. **Extension Communication Testing**
   - Test message passing security
   - Test external website communication
   - Test content script isolation

## Desktop Application Testing

1. **Electron Application Security**
   - Test nodeIntegration settings
   - Test contextIsolation effectiveness
   - Test preload script security
   - Test remote module restrictions

2. **Native Application Security**
   - Test installation directory permissions
   - Test update mechanism security
   - Test memory corruption vulnerabilities
   - Test local privilege escalation

## IoT Device Integration Testing

1. **Device Communication Security**
   - Test API communication security
   - Test device authentication
   - Test command injection vectors
   - Test firmware update security

2. **Mobile-IoT Interaction**
   - Test pairing security
   - Test Bluetooth security
   - Test local network communication
   - Test device control authorization

## Platform-Specific Reporting

### Severity Classification Matrix

| Vulnerability Type | Critical | High | Medium | Low |
|-------------------|----------|------|--------|-----|
| Authentication Bypass | Full system access | Partial authenticated access | Limited access increase | Theoretical bypass |
| Injection | Remote code execution | Data leakage | UI manipulation | Limited context injection |
| Data Exposure | PII/credentials exposed | Internal data exposed | Non-sensitive data exposed | Debug information exposed |

### Exploitation Proof Requirements

For each platform, provide:
1. **Detailed reproduction steps**
   - Platform-specific tools used
   - Exact API calls or payloads
   - Screenshots or video evidence
   - Environmental requirements

2. **Impact demonstration**
   - Business impact assessment
   - Technical risk quantification
   - Affected user populations
   - Data compromise scope

## Related Documentation

- **[PENETRATION_TESTING.md](src/docs/security/PENETRATION_TESTING.md)**: Core penetration testing methodology
- **[SECURITY_TESTING.md](src/docs/security/SECURITY_TESTING.md)**: Overall security testing framework
- **[MOBILE_SECURITY.md](src/docs/security/MOBILE_SECURITY.md)**: Mobile application security
- **[../implementation/testing/API_TESTING.md](src/docs/implementation/testing/API_TESTING.md)**: API security testing

## Version History

- **1.0.0**: Initial platform-specific penetration testing guidelines (2025-05-23)
