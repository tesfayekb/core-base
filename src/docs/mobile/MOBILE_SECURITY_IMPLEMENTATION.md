# Mobile Security Implementation Guide

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-22

## Overview

This document provides concrete implementation guidance for securing mobile applications within the system. It covers practical security measures, code examples, and best practices specific to mobile platforms.

## Secure Storage Implementation

### Sensitive Data Storage

Mobile applications must properly secure sensitive data using platform-specific secure storage:

```typescript
// iOS/Android secure storage implementation
import SecureStorage from 'react-native-secure-storage';

export class MobileSecureStorage {
  private static instance: MobileSecureStorage;
  
  private constructor() {}
  
  static getInstance(): MobileSecureStorage {
    if (!MobileSecureStorage.instance) {
      MobileSecureStorage.instance = new MobileSecureStorage();
    }
    return MobileSecureStorage.instance;
  }
  
  async storeSecureData(key: string, value: string): Promise<void> {
    try {
      await SecureStorage.setItem(
        key,
        value,
        {
          accessGroup: 'com.company.app', // iOS Keychain sharing
          service: 'com.company.app',     // Android KeyStore alias
          accessible: 'AccessibleAfterFirstUnlock'
        }
      );
    } catch (error) {
      throw new Error(`Failed to store secure data: ${error.message}`);
    }
  }
  
  async getSecureData(key: string): Promise<string | null> {
    try {
      return await SecureStorage.getItem(key);
    } catch (error) {
      console.error(`Error retrieving secure data: ${error.message}`);
      return null;
    }
  }
  
  async removeSecureData(key: string): Promise<void> {
    try {
      await SecureStorage.removeItem(key);
    } catch (error) {
      throw new Error(`Failed to remove secure data: ${error.message}`);
    }
  }
}

// Usage example for auth tokens
const secureStorage = MobileSecureStorage.getInstance();
await secureStorage.storeSecureData('auth_token', token);
```

### Token Management

Implementation pattern for secure token management:

```typescript
// Mobile token management implementation
export class TokenManager {
  private secureStorage = MobileSecureStorage.getInstance();
  private readonly TOKEN_KEY = 'auth_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  
  async saveTokens(token: string, refreshToken: string): Promise<void> {
    await this.secureStorage.storeSecureData(this.TOKEN_KEY, token);
    await this.secureStorage.storeSecureData(this.REFRESH_TOKEN_KEY, refreshToken);
  }
  
  async getAuthToken(): Promise<string | null> {
    return this.secureStorage.getSecureData(this.TOKEN_KEY);
  }
  
  async getRefreshToken(): Promise<string | null> {
    return this.secureStorage.getSecureData(this.REFRESH_TOKEN_KEY);
  }
  
  async clearTokens(): Promise<void> {
    await this.secureStorage.removeSecureData(this.TOKEN_KEY);
    await this.secureStorage.removeSecureData(this.REFRESH_TOKEN_KEY);
  }
}
```

## Authentication Flow Implementation

### Biometric Authentication

```typescript
// Biometric authentication implementation
import { authenticate } from 'react-native-biometrics';

export class BiometricAuthenticator {
  async authenticateUser(): Promise<boolean> {
    try {
      const { success } = await authenticate({
        promptMessage: 'Authenticate to continue',
        cancelButtonText: 'Cancel',
        fallbackPromptMessage: 'Use passcode'
      });
      
      return success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }
}

// Usage in authentication flow
export class MobileAuthService {
  private biometricAuth = new BiometricAuthenticator();
  private tokenManager = new TokenManager();
  
  async login(credentials: { username: string; password: string }): Promise<boolean> {
    try {
      // 1. Perform API authentication
      const response = await apiClient.post('/auth/login', credentials);
      const { token, refreshToken } = response.data;
      
      // 2. Store tokens securely
      await this.tokenManager.saveTokens(token, refreshToken);
      
      // 3. Optionally enroll device for biometrics
      await this.enrollForBiometrics();
      
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  }
  
  async authenticateWithBiometrics(): Promise<boolean> {
    // 1. Check if token exists
    const token = await this.tokenManager.getAuthToken();
    if (!token) return false;
    
    // 2. Perform biometric authentication
    const authenticated = await this.biometricAuth.authenticateUser();
    if (!authenticated) return false;
    
    // 3. Verify token is still valid
    return this.verifyToken(token);
  }
  
  private async verifyToken(token: string): Promise<boolean> {
    try {
      await apiClient.get('/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return true;
    } catch (error) {
      // Token invalid, try refresh
      return this.refreshAuthentication();
    }
  }
  
  private async refreshAuthentication(): Promise<boolean> {
    try {
      const refreshToken = await this.tokenManager.getRefreshToken();
      if (!refreshToken) return false;
      
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { token, newRefreshToken } = response.data;
      
      await this.tokenManager.saveTokens(token, newRefreshToken);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await this.tokenManager.clearTokens();
      return false;
    }
  }
  
  private async enrollForBiometrics(): Promise<void> {
    // Implementation for biometric enrollment
    const biometricsAvailable = await checkBiometricsAvailable();
    if (biometricsAvailable) {
      const userConsent = await promptForBiometricConsent();
      if (userConsent) {
        await setupBiometricAuthentication();
      }
    }
  }
}
```

## Network Security Implementation

### Certificate Pinning

```typescript
// Certificate pinning implementation
import { fetch } from 'react-native-ssl-pinning';

export class SecureApiClient {
  private baseUrl: string;
  private sslPinningConfig: any;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.sslPinningConfig = {
      certs: ['cert1', 'cert2'], // Certificate hashes
      disableAllSecurity: false, // Never disable in production
      validateDomainName: true   // Always validate domain
    };
  }
  
  async get<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers,
        sslPinning: this.sslPinningConfig,
        timeoutInterval: 10000
      });
      
      return await response.json();
    } catch (error) {
      this.handleNetworkError(error);
      throw error;
    }
  }
  
  async post<T>(endpoint: string, data: any, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data),
        sslPinning: this.sslPinningConfig,
        timeoutInterval: 10000
      });
      
      return await response.json();
    } catch (error) {
      this.handleNetworkError(error);
      throw error;
    }
  }
  
  async put<T>(endpoint: string, data: any, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(data),
        sslPinning: this.sslPinningConfig,
        timeoutInterval: 10000
      });
      
      return await response.json();
    } catch (error) {
      this.handleNetworkError(error);
      throw error;
    }
  }
  
  async delete<T>(endpoint: string, headers: Record<string, string> = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers,
        sslPinning: this.sslPinningConfig,
        timeoutInterval: 10000
      });
      
      return await response.json();
    } catch (error) {
      this.handleNetworkError(error);
      throw error;
    }
  }
  
  private handleNetworkError(error: any): void {
    if (error.message.includes('SSL')) {
      // Potential security breach - certificate mismatch
      // Log security incident and consider app termination
      console.error('SSL Certificate validation failed - potential security breach');
      // securityIncidentLogger.logCritical('ssl_validation_failure', error);
    }
    
    // Other error handling...
    console.error('Network request failed:', error);
  }
}
```

## Secure UI Implementation

### Screen Security

```typescript
// Screen security implementation
import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export function useScreenSecurity(onForeground: () => void, onBackground: () => void) {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // App came to foreground
        onForeground();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background
        onBackground();
      }
    });
    
    return () => {
      subscription.remove();
    };
  }, [onForeground, onBackground]);
}

// Example usage in sensitive screen
function SecureScreen() {
  const navigation = useNavigation();
  
  useScreenSecurity(
    // Foreground handler - verify authentication
    async () => {
      const authService = new MobileAuthService();
      const isAuthenticated = await authService.verifyAuthentication();
      
      if (!isAuthenticated) {
        navigation.navigate('Login');
      }
    },
    // Background handler - blur sensitive data
    () => {
      // Blur screen or navigate away
      navigation.navigate('BlurOverlay');
    }
  );
  
  // Render component...
  return (
    <View>
      <Text>Sensitive Data Screen</Text>
      <Text>Account: {accountNumber}</Text>
      <Text>Balance: ${balance}</Text>
    </View>
  );
}
```

## Secure Coding Checklist

### Code-Level Security Controls

✅ **Input Validation**
```typescript
// Input validation implementation
import { z } from 'zod';

const userInputSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional()
});

function validateUserInput(input: unknown): boolean {
  try {
    userInputSchema.parse(input);
    return true;
  } catch (error) {
    console.error('Validation error:', error);
    return false;
  }
}
```

✅ **Content Security**
```typescript
// Content security implementation
function sanitizeHtmlContent(html: string): string {
  // Use a proper HTML sanitizer library
  return sanitizeHtml(html, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: {
      'a': ['href']
    },
    allowedSchemes: ['https']
  });
}
```

## Root Detection and Tampering Prevention

```typescript
// Root/jailbreak detection implementation
import { isRooted } from 'react-native-security-utils';

export async function performSecurityChecks(): Promise<{
  passed: boolean;
  issues: string[];
}> {
  const issues: string[] = [];
  
  // Check for root/jailbreak
  if (await isRooted()) {
    issues.push('Device is rooted/jailbroken');
  }
  
  // Check for emulator
  if (await isEmulator()) {
    issues.push('Running on emulator');
  }
  
  // Check for tampering
  if (await isAppTampered()) {
    issues.push('App has been modified');
  }
  
  return {
    passed: issues.length === 0,
    issues
  };
}

// Emulator detection implementation
async function isEmulator(): Promise<boolean> {
  // Implementation depends on platform
  // For Android:
  if (Platform.OS === 'android') {
    return (
      android.os.Build.FINGERPRINT.includes('generic') ||
      android.os.Build.MANUFACTURER.includes('Genymotion') ||
      android.os.Build.MODEL.includes('google_sdk') ||
      android.os.Build.MODEL.includes('Emulator') ||
      android.os.Build.MODEL.includes('Android SDK built for x86') ||
      android.os.Build.BRAND.includes('generic') ||
      android.os.Build.DEVICE.includes('generic')
    );
  }
  
  // For iOS:
  if (Platform.OS === 'ios') {
    const processInfo = NativeModules.ProcessInfo || {};
    return processInfo.environment?.SIMULATOR_DEVICE_NAME !== undefined;
  }
  
  return false;
}

// App tampering detection
async function isAppTampered(): Promise<boolean> {
  try {
    // Check app signature/hash
    const appSignature = await getAppSignature();
    const validSignatures = ['valid_signature_1', 'valid_signature_2'];
    
    if (!validSignatures.includes(appSignature)) {
      return true;
    }
    
    // Check for known tampering tools
    const hasTamperingTools = await checkForTamperingTools();
    if (hasTamperingTools) {
      return true;
    }
    
    return false;
  } catch (error) {
    // If we can't verify, assume tampering for safety
    console.error('Error checking app integrity:', error);
    return true;
  }
}

// Implementation of signature checking
async function getAppSignature(): Promise<string> {
  // Platform-specific implementation
  if (Platform.OS === 'android') {
    return NativeModules.SecurityUtils.getAppSignature();
  } else {
    // iOS implementation
    return NativeModules.SecurityUtils.getAppHash();
  }
}

// Check for tampering tools
async function checkForTamperingTools(): Promise<boolean> {
  // Check for known tampering tools
  const suspiciousApps = [
    'com.fdt.frida',
    'com.saurik.substrate',
    'com.koushikdutta.superuser',
    'com.thirdparty.superuser'
  ];
  
  if (Platform.OS === 'android') {
    for (const app of suspiciousApps) {
      const isInstalled = await NativeModules.SecurityUtils.isAppInstalled(app);
      if (isInstalled) {
        return true;
      }
    }
  }
  
  return false;
}
```

## Security Testing for Mobile

### Automated Security Testing

```typescript
// Example of mobile security testing script
describe('Mobile Security Tests', () => {
  test('Secure storage encrypts data properly', async () => {
    const secureStorage = MobileSecureStorage.getInstance();
    const testKey = 'test_secure_key';
    const testValue = 'sensitive_information';
    
    await secureStorage.storeSecureData(testKey, testValue);
    
    // Verify data is stored securely
    const storedData = await secureStorage.getSecureData(testKey);
    expect(storedData).toBe(testValue);
    
    // Verify data is not in plain storage
    const plainStorage = AsyncStorage;
    const plainData = await plainStorage.getItem(testKey);
    expect(plainData).not.toBe(testValue);
    
    // Clean up
    await secureStorage.removeSecureData(testKey);
  });
  
  test('Token manager stores and retrieves tokens correctly', async () => {
    const tokenManager = new TokenManager();
    const testToken = 'test-auth-token';
    const testRefreshToken = 'test-refresh-token';
    
    await tokenManager.saveTokens(testToken, testRefreshToken);
    
    const retrievedToken = await tokenManager.getAuthToken();
    const retrievedRefreshToken = await tokenManager.getRefreshToken();
    
    expect(retrievedToken).toBe(testToken);
    expect(retrievedRefreshToken).toBe(testRefreshToken);
    
    // Clean up
    await tokenManager.clearTokens();
    
    const clearedToken = await tokenManager.getAuthToken();
    expect(clearedToken).toBeNull();
  });
  
  test('Certificate pinning rejects invalid certificates', async () => {
    const secureApiClient = new SecureApiClient('https://api.example.com');
    
    // Mock invalid certificate response
    global.fetch = jest.fn().mockRejectedValue(new Error('SSL certificate validation failed'));
    
    await expect(secureApiClient.get('/test-endpoint')).rejects.toThrow('SSL certificate validation failed');
  });
  
  test('Security checks detect emulator environment', async () => {
    // Mock emulator detection
    jest.mock('react-native', () => ({
      Platform: {
        OS: 'android'
      },
      NativeModules: {
        SecurityUtils: {
          isEmulator: jest.fn().mockResolvedValue(true)
        }
      }
    }));
    
    const securityResult = await performSecurityChecks();
    
    expect(securityResult.passed).toBe(false);
    expect(securityResult.issues).toContain('Running on emulator');
  });
});
```

## Related Documentation

- **[../security/MOBILE_SECURITY.md](../security/MOBILE_SECURITY.md)**: Mobile security overview
- **[../security/AUTH_SYSTEM.md](../security/AUTH_SYSTEM.md)**: Authentication system
- **[../security/COMMUNICATION_SECURITY.md](../security/COMMUNICATION_SECURITY.md)**: Secure communication
- **[MOBILE_OFFLINE_SECURITY.md](MOBILE_OFFLINE_SECURITY.md)**: Security for offline mobile functionality
- **[../rbac/README.md](../rbac/README.md)**: RBAC system documentation

## Version History

- **1.0.0**: Initial mobile security implementation guide (2025-05-22)
