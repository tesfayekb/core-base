# Mobile Security Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides detailed implementation guidelines for security features in the mobile application, expanding on the architectural principles defined in [SECURITY.md](SECURITY.md).

## Authentication Implementation

### Biometric Authentication

```typescript
// Biometric authentication implementation for mobile
import { BiometricAuth } from '@capacitor-community/biometric-auth';

export class MobileBiometricAuthentication {
  private static instance: MobileBiometricAuthentication;
  
  private constructor() {}
  
  public static getInstance(): MobileBiometricAuthentication {
    if (!MobileBiometricAuthentication.instance) {
      MobileBiometricAuthentication.instance = new MobileBiometricAuthentication();
    }
    return MobileBiometricAuthentication.instance;
  }
  
  /**
   * Check if device supports biometric authentication
   */
  public async isBiometricAvailable(): Promise<boolean> {
    try {
      const { isAvailable } = await BiometricAuth.isAvailable();
      return isAvailable;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }
  
  /**
   * Authenticate user with biometrics
   */
  public async authenticate(options: {
    reason?: string;
    title?: string;
  } = {}): Promise<boolean> {
    try {
      const result = await BiometricAuth.authenticate({
        reason: options.reason || 'Verify your identity',
        title: options.title || 'Biometric Authentication'
      });
      
      return result.verified;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }
  
  /**
   * Register biometric authentication for future use
   */
  public async register(userId: string): Promise<boolean> {
    try {
      // Store flag indicating user has enabled biometrics
      await this.saveUserBiometricPreference(userId, true);
      return true;
    } catch (error) {
      console.error('Error registering biometrics:', error);
      return false;
    }
  }
  
  /**
   * Check if user has enabled biometric authentication
   */
  public async userHasEnabledBiometrics(userId: string): Promise<boolean> {
    try {
      const enabled = await this.getUserBiometricPreference(userId);
      return enabled === true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Save user's biometric preference
   */
  private async saveUserBiometricPreference(userId: string, enabled: boolean): Promise<void> {
    // Save to secure storage
    const secureStorage = new SecureStorageService();
    await secureStorage.setItem(`biometric_enabled_${userId}`, JSON.stringify(enabled));
  }
  
  /**
   * Get user's biometric preference
   */
  private async getUserBiometricPreference(userId: string): Promise<boolean> {
    // Get from secure storage
    const secureStorage = new SecureStorageService();
    const pref = await secureStorage.getItem(`biometric_enabled_${userId}`);
    return pref ? JSON.parse(pref) : false;
  }
}
```

### Secure Credential Storage

```typescript
// Secure credential storage implementation
import { Capacitor } from '@capacitor/core';
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';

export class SecureStorageService {
  /**
   * Store item in secure storage
   */
  public async setItem(key: string, value: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use native secure storage on mobile
        await SecureStoragePlugin.set({
          key,
          value
        });
      } else {
        // Use encrypted localStorage for web
        const encryptedValue = this.encrypt(value);
        localStorage.setItem(key, encryptedValue);
      }
    } catch (error) {
      console.error('Error storing secure item:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve item from secure storage
   */
  public async getItem(key: string): Promise<string | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use native secure storage on mobile
        const result = await SecureStoragePlugin.get({ key });
        return result.value;
      } else {
        // Use encrypted localStorage for web
        const encryptedValue = localStorage.getItem(key);
        if (!encryptedValue) return null;
        return this.decrypt(encryptedValue);
      }
    } catch (error) {
      console.error('Error retrieving secure item:', error);
      return null;
    }
  }
  
  /**
   * Remove item from secure storage
   */
  public async removeItem(key: string): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use native secure storage on mobile
        await SecureStoragePlugin.remove({ key });
      } else {
        // Use localStorage for web
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Error removing secure item:', error);
      throw error;
    }
  }
  
  /**
   * Clear all items in secure storage
   */
  public async clear(): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use native secure storage on mobile
        await SecureStoragePlugin.clear();
      } else {
        // Use localStorage for web
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('secure_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Error clearing secure storage:', error);
      throw error;
    }
  }
  
  /**
   * Simple encryption for web storage (not for sensitive data)
   * Production should use a more robust encryption library
   */
  private encrypt(value: string): string {
    // Implementation would use a proper encryption library
    return `secure_${btoa(value)}`;
  }
  
  /**
   * Simple decryption for web storage
   */
  private decrypt(value: string): string {
    if (!value.startsWith('secure_')) {
      throw new Error('Invalid encrypted value');
    }
    return atob(value.substring(7));
  }
}
```

### Offline Authentication

```typescript
// Offline authentication implementation
export class OfflineAuthenticationService {
  private secureStorage: SecureStorageService;
  
  constructor() {
    this.secureStorage = new SecureStorageService();
  }
  
  /**
   * Store authentication data for offline use
   */
  public async storeOfflineAuthData(authData: {
    userId: string;
    sessionToken: string;
    permissions: any[];
    expiresAt: number;
  }): Promise<void> {
    // Store encrypted auth data
    await this.secureStorage.setItem(
      `offline_auth_${authData.userId}`,
      JSON.stringify({
        sessionToken: authData.sessionToken,
        permissions: authData.permissions,
        expiresAt: authData.expiresAt,
        lastSynced: Date.now()
      })
    );
  }
  
  /**
   * Authenticate user in offline mode
   */
  public async authenticateOffline(credentials: {
    userId: string;
    password: string;
  }): Promise<{
    success: boolean;
    userId?: string;
    sessionToken?: string;
    permissions?: any[];
    expiresAt?: number;
  }> {
    try {
      // Get stored hash for user
      const storedHashKey = `offline_password_hash_${credentials.userId}`;
      const storedHash = await this.secureStorage.getItem(storedHashKey);
      
      if (!storedHash) {
        return { success: false };
      }
      
      // Verify password against stored hash
      const isValid = await this.verifyPasswordHash(credentials.password, storedHash);
      
      if (!isValid) {
        return { success: false };
      }
      
      // Get offline auth data
      const authDataKey = `offline_auth_${credentials.userId}`;
      const authDataJson = await this.secureStorage.getItem(authDataKey);
      
      if (!authDataJson) {
        return { success: false };
      }
      
      const authData = JSON.parse(authDataJson);
      
      // Check if expired
      if (authData.expiresAt < Date.now()) {
        return { success: false };
      }
      
      return {
        success: true,
        userId: credentials.userId,
        sessionToken: authData.sessionToken,
        permissions: authData.permissions,
        expiresAt: authData.expiresAt
      };
    } catch (error) {
      console.error('Offline authentication error:', error);
      return { success: false };
    }
  }
  
  /**
   * Store password hash for offline authentication
   */
  public async storePasswordHash(userId: string, password: string): Promise<void> {
    const hash = await this.hashPassword(password);
    await this.secureStorage.setItem(`offline_password_hash_${userId}`, hash);
  }
  
  /**
   * Hash password using PBKDF2
   */
  private async hashPassword(password: string): Promise<string> {
    // In a real implementation, use a proper crypto library with PBKDF2
    // This is a simplified example
    return `hashed_${btoa(password)}_with_salt`;
  }
  
  /**
   * Verify password against stored hash
   */
  private async verifyPasswordHash(password: string, hash: string): Promise<boolean> {
    // In a real implementation, use a proper crypto library
    // This is a simplified example
    const newHash = await this.hashPassword(password);
    return newHash === hash;
  }
}
```

## Data Protection Implementation

### Encrypted Local Storage

```typescript
// Encrypted database implementation
import { Capacitor } from '@capacitor/core';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

export class EncryptedDatabaseService {
  private sqlite: SQLiteConnection;
  private dbName = 'app-encrypted.db';
  private isInitialized = false;
  
  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }
  
  /**
   * Initialize the encrypted database
   */
  public async initialize(encryptionKey: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Set encryption secret
        await this.sqlite.setEncryptionSecret(encryptionKey);
        
        // Create or open database with encryption
        await this.sqlite.createConnection(
          this.dbName,
          true, // encrypted
          'no-encryption-key', // this is ignored when encrypted is true
          1 // version
        );
        
        await this.sqlite.open(this.dbName);
        
        // Create tables if needed
        await this.createTablesIfNeeded();
        
        this.isInitialized = true;
      } else {
        // Web platform - use IndexedDB with encryption wrapper
        console.warn('Encrypted database not fully supported in web platform');
        // Implementation would use a web-compatible encrypted storage solution
      }
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }
  
  /**
   * Execute a query on the encrypted database
   */
  public async executeQuery(query: string, params: any[] = []): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      const result = await this.sqlite.executeQuery(this.dbName, query, params);
      return result;
    } catch (error) {
      console.error('Query execution error:', error);
      throw error;
    }
  }
  
  /**
   * Execute a set of queries in a transaction
   */
  public async executeTransaction(queries: Array<{ query: string; params: any[] }>): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }
    
    try {
      // Begin transaction
      await this.sqlite.executeQuery(this.dbName, 'BEGIN TRANSACTION', []);
      
      // Execute all queries
      for (const { query, params } of queries) {
        await this.sqlite.executeQuery(this.dbName, query, params);
      }
      
      // Commit transaction
      await this.sqlite.executeQuery(this.dbName, 'COMMIT', []);
    } catch (error) {
      // Rollback on error
      await this.sqlite.executeQuery(this.dbName, 'ROLLBACK', []);
      console.error('Transaction execution error:', error);
      throw error;
    }
  }
  
  /**
   * Close the database connection
   */
  public async close(): Promise<void> {
    if (this.isInitialized) {
      await this.sqlite.close(this.dbName);
      this.isInitialized = false;
    }
  }
  
  /**
   * Create database tables if they don't exist
   */
  private async createTablesIfNeeded(): Promise<void> {
    // Create tables with tenant_id for multi-tenant isolation
    const queries = [
      `CREATE TABLE IF NOT EXISTS offline_resources (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER,
        synced INTEGER DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS idx_offline_resources_tenant 
        ON offline_resources(tenant_id)`,
      `CREATE TABLE IF NOT EXISTS offline_sync_queue (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT,
        data TEXT,
        created_at INTEGER,
        attempt_count INTEGER DEFAULT 0
      )`
    ];
    
    for (const query of queries) {
      await this.sqlite.executeQuery(this.dbName, query, []);
    }
  }
}
```

### File Encryption

```typescript
// Secure file handling implementation
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

export class SecureFileService {
  /**
   * Save encrypted file
   */
  public async saveEncryptedFile(
    fileName: string,
    data: string,
    encryptionKey: string
  ): Promise<string> {
    try {
      // Encrypt data
      const encryptedData = this.encryptData(data, encryptionKey);
      
      // Save file
      const result = await Filesystem.writeFile({
        path: `secure/${fileName}`,
        data: encryptedData,
        directory: Directory.Data,
        recursive: true
      });
      
      return result.uri;
    } catch (error) {
      console.error('Error saving encrypted file:', error);
      throw error;
    }
  }
  
  /**
   * Read and decrypt file
   */
  public async readEncryptedFile(
    fileName: string,
    encryptionKey: string
  ): Promise<string> {
    try {
      // Read file
      const result = await Filesystem.readFile({
        path: `secure/${fileName}`,
        directory: Directory.Data
      });
      
      // Decrypt data
      return this.decryptData(result.data, encryptionKey);
    } catch (error) {
      console.error('Error reading encrypted file:', error);
      throw error;
    }
  }
  
  /**
   * Delete secure file
   */
  public async deleteFile(fileName: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: `secure/${fileName}`,
        directory: Directory.Data
      });
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
  
  /**
   * List all secure files
   */
  public async listSecureFiles(): Promise<string[]> {
    try {
      const result = await Filesystem.readdir({
        path: 'secure',
        directory: Directory.Data
      });
      
      return result.files.map(file => file.name);
    } catch (error) {
      // Directory might not exist yet
      if (error.message.includes('not found')) {
        return [];
      }
      
      console.error('Error listing secure files:', error);
      throw error;
    }
  }
  
  /**
   * Encrypt data with key
   * Note: In production, use a proper encryption library
   */
  private encryptData(data: string, key: string): string {
    // This is a simplified example
    // In production, use proper encryption like AES
    const encryptedPrefix = btoa(key.substring(0, 5));
    return `${encryptedPrefix}:${btoa(data)}`;
  }
  
  /**
   * Decrypt data with key
   * Note: In production, use a proper encryption library
   */
  private decryptData(encryptedData: string, key: string): string {
    // This is a simplified example
    // In production, use proper decryption like AES
    const parts = encryptedData.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Verify key prefix
    const encryptedPrefix = btoa(key.substring(0, 5));
    if (parts[0] !== encryptedPrefix) {
      throw new Error('Invalid encryption key');
    }
    
    return atob(parts[1]);
  }
}
```

## API Security Implementation

### Certificate Pinning

```typescript
// Certificate pinning implementation
import { fetch } from 'react-native-ssl-pinning';

export class SecureApiClient {
  private baseUrl: string;
  private certificateHashes: string[];
  
  constructor(baseUrl: string, certificateHashes: string[]) {
    this.baseUrl = baseUrl;
    this.certificateHashes = certificateHashes;
  }
  
  /**
   * Make secure API request with certificate pinning
   */
  public async request<T>(options: {
    endpoint: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
  }): Promise<T> {
    const { endpoint, method = 'GET', headers = {}, body } = options;
    
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        sslPinning: {
          certs: this.certificateHashes
        },
        timeoutInterval: 10000
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const responseData = await response.json();
      return responseData as T;
    } catch (error) {
      console.error('Secure API request failed:', error);
      throw error;
    }
  }
}
```

### Secure Analytics

```typescript
// Secure analytics implementation for mobile
export class SecureAnalyticsService {
  private apiClient: SecureApiClient;
  private sessionId: string;
  private userId?: string;
  private eventQueue: Array<{
    type: string;
    data: any;
    timestamp: number;
  }> = [];
  private isSending = false;
  
  constructor(apiClient: SecureApiClient) {
    this.apiClient = apiClient;
    this.sessionId = this.generateSessionId();
  }
  
  /**
   * Set user identifier for analytics
   */
  public setUserId(userId: string): void {
    this.userId = userId;
  }
  
  /**
   * Track event with secure transmission
   */
  public async trackEvent(eventType: string, eventData: any): Promise<void> {
    // Add to queue
    this.eventQueue.push({
      type: eventType,
      data: eventData,
      timestamp: Date.now()
    });
    
    // Process queue if not already sending
    if (!this.isSending) {
      await this.processQueue();
    }
  }
  
  /**
   * Process queued events
   */
  private async processQueue(): Promise<void> {
    if (this.eventQueue.length === 0 || this.isSending) {
      return;
    }
    
    try {
      this.isSending = true;
      
      // Get events to send (max 10 at once)
      const eventsToSend = this.eventQueue.slice(0, 10);
      
      // Send events
      await this.apiClient.request({
        endpoint: '/analytics/events',
        method: 'POST',
        body: {
          sessionId: this.sessionId,
          userId: this.userId,
          events: eventsToSend,
          deviceInfo: this.getDeviceInfo()
        }
      });
      
      // Remove sent events from queue
      this.eventQueue = this.eventQueue.slice(eventsToSend.length);
      
      // Continue processing if more events exist
      if (this.eventQueue.length > 0) {
        await this.processQueue();
      }
    } catch (error) {
      console.error('Error sending analytics events:', error);
      // Keep events in queue for retry
    } finally {
      this.isSending = false;
    }
  }
  
  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Get device information
   */
  private getDeviceInfo(): any {
    // Implementation would use device info plugin
    return {
      platform: 'ios', // or android
      osVersion: '14.0',
      deviceModel: 'iPhone',
      appVersion: '1.0.0'
    };
  }
}
```

## Related Documentation

- **[SECURITY.md](SECURITY.md)**: Mobile-specific security overview
- **[../security/MOBILE_SECURITY.md](../security/MOBILE_SECURITY.md)**: Detailed mobile security architecture
- **[OVERVIEW.md](OVERVIEW.md)**: Mobile implementation approach
- **[OFFLINE.md](OFFLINE.md)**: Offline functionality implementation

## Version History

- **1.0.0**: Initial mobile security implementation examples (2025-05-23)
