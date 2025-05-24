# Data Protection Framework

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-19

This document details the technical implementation of data protection mechanisms across the application, focusing on encryption, privacy, and data security.

## Data Classification Framework

### Classification Levels

The system implements a comprehensive data classification scheme to determine appropriate protection levels:

| Classification | Description | Examples | Protection Requirements |
|----------------|-------------|----------|------------------------|
| Public | Information that can be freely disclosed | Marketing materials, public docs | Basic integrity controls |
| Internal | General business data not for public | Internal communications, non-sensitive business docs | Access controls, basic encryption at rest |
| Confidential | Business data that could cause harm if disclosed | Business strategies, non-public financial data | Strong access controls, encryption at rest and in transit |
| Restricted | Highly sensitive data with regulatory requirements | PII, payment data, health data | Maximal controls: encryption, masking, strict access, audit logging |

### Data Protection by Category Implementation

```typescript
/**
 * Data protection factory implementation
 */
class DataProtectionFactory {
  /**
   * Get the appropriate data protection strategy
   */
  static getProtectionStrategy(classification: DataClassification): DataProtectionStrategy {
    switch (classification) {
      case 'restricted':
        return new RestrictedDataProtection();
      case 'confidential':
        return new ConfidentialDataProtection();
      case 'internal':
        return new InternalDataProtection();
      case 'public':
      default:
        return new PublicDataProtection();
    }
  }
}

/**
 * Base protection strategy implementation
 */
abstract class DataProtectionStrategy {
  abstract encrypt(data: any): Promise<EncryptedData>;
  abstract decrypt(encryptedData: EncryptedData): Promise<any>;
  abstract mask(data: any): string;
  abstract validateAccess(userId: string, purpose: string): Promise<boolean>;
  abstract auditAccess(userId: string, action: string, dataType: string): Promise<void>;
}

/**
 * Restricted data protection implementation
 */
class RestrictedDataProtection extends DataProtectionStrategy {
  async encrypt(data: any): Promise<EncryptedData> {
    // 1. Use strongest encryption algorithm (AES-256-GCM)
    const iv = crypto.randomBytes(16);
    const key = await this.getDerivedKey();
    
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    // 2. Add authentication data for additional security
    const aad = crypto.randomBytes(32);
    cipher.setAAD(aad);
    
    // 3. Encrypt the data
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 4. Get auth tag
    const authTag = cipher.getAuthTag();
    
    // 5. Return encrypted data with all parameters needed for decryption
    return {
      data: encrypted,
      iv: iv.toString('hex'),
      aad: aad.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: 'aes-256-gcm',
      keyId: await this.getCurrentKeyId()
    };
  }
  
  async decrypt(encryptedData: EncryptedData): Promise<any> {
    try {
      // 1. Get the right key based on keyId
      const key = await this.getKeyById(encryptedData.keyId);
      const iv = Buffer.from(encryptedData.iv, 'hex');
      
      // 2. Setup decipher
      const decipher = crypto.createDecipheriv(
        encryptedData.algorithm, 
        key, 
        iv
      );
      
      // 3. Add authentication data
      const aad = Buffer.from(encryptedData.aad, 'hex');
      decipher.setAAD(aad);
      
      // 4. Set auth tag
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      decipher.setAuthTag(authTag);
      
      // 5. Decrypt
      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      // 6. Parse and return
      return JSON.parse(decrypted);
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  mask(data: any): string {
    // Implementation for highly sensitive data masking
    if (typeof data === 'string') {
      // For PII like SSN: ***-**-1234
      if (/^\d{3}-\d{2}-\d{4}$/.test(data)) {
        return '***-**-' + data.slice(7);
      }
      
      // For payment card data: **** **** **** 1234
      if (/^\d{16}$/.test(data.replace(/\s/g, ''))) {
        return '**** **** **** ' + data.replace(/\s/g, '').slice(12);
      }
      
      // For emails: j***@e*****.com
      if (/^[^@]+@[^@]+\.[^@]+$/.test(data)) {
        const [local, domain] = data.split('@');
        return `${local[0]}***@${domain[0]}*****${domain.length > 1 ? '.' + domain.split('.')[1] : ''}`;
      }
      
      // Default masking - show 25% of characters
      if (data.length > 4) {
        const visibleChars = Math.max(1, Math.floor(data.length * 0.25));
        return data.substring(0, visibleChars) + '*'.repeat(data.length - visibleChars);
      }
      
      // For very short strings, mask everything
      return '*'.repeat(data.length);
    }
    
    return '[MASKED]';
  }
  
  async validateAccess(userId: string, purpose: string): Promise<boolean> {
    // 1. Check if user has required permissions
    const hasPermission = await permissionService.checkUserPermission(
      userId,
      'restricted_data',
      'view'
    );
    
    if (!hasPermission) {
      return false;
    }
    
    // 2. Check for specific purpose-based limitations
    const purposeValid = await this.validatePurpose(userId, purpose);
    
    if (!purposeValid) {
      return false;
    }
    
    // 3. Check for additional security requirements (MFA, etc)
    const securityRequirements = await this.checkSecurityRequirements(userId);
    
    return securityRequirements.satisfied;
  }
  
  async auditAccess(userId: string, action: string, dataType: string): Promise<void> {
    await auditService.logEvent({
      type: 'data_access',
      subtype: 'restricted_data_access',
      userId,
      metadata: {
        action,
        dataType,
        timestamp: new Date().toISOString(),
        ipAddress: getClientIPAddress(),
        justification: await this.getAccessJustification(userId)
      }
    });
    
    // For restricted data, we also trigger alerts for security monitoring
    await securityMonitoringService.dataAccessAlert(
      userId, 
      'restricted', 
      dataType,
      action
    );
  }
  
  // Helper methods (implementation details omitted)
  private async getDerivedKey(): Promise<Buffer> { /* ... */ }
  private async getCurrentKeyId(): Promise<string> { /* ... */ }
  private async getKeyById(keyId: string): Promise<Buffer> { /* ... */ }
  private async validatePurpose(userId: string, purpose: string): Promise<boolean> { /* ... */ }
  private async checkSecurityRequirements(userId: string): Promise<SecurityCheck> { /* ... */ }
  private async getAccessJustification(userId: string): Promise<string> { /* ... */ }
}
```

### Field-Level Security Implementation

The system implements field-level data protection through multiple mechanisms:

```typescript
/**
 * Field-level encryption implementation
 */
class FieldEncryption {
  /**
   * Encrypt a specific field
   */
  static async encryptField(
    value: any, 
    field: string, 
    classification: DataClassification
  ): Promise<string> {
    // 1. Get protection strategy for field's classification
    const protector = DataProtectionFactory.getProtectionStrategy(classification);
    
    // 2. Encrypt the field
    const encrypted = await protector.encrypt(value);
    
    // 3. Encode the encrypted data for storage
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }
  
  /**
   * Decrypt a specific field
   */
  static async decryptField(
    encryptedValue: string, 
    field: string,
    userId: string,
    purpose: string
  ): Promise<any> {
    // 1. Get field metadata to determine classification
    const fieldMeta = await this.getFieldMetadata(field);
    
    // 2. Validate access for this user and purpose
    const protector = DataProtectionFactory.getProtectionStrategy(fieldMeta.classification);
    const accessAllowed = await protector.validateAccess(userId, purpose);
    
    if (!accessAllowed) {
      throw new Error(`Access denied for field ${field}`);
    }
    
    // 3. Decode the stored data
    const jsonStr = Buffer.from(encryptedValue, 'base64').toString();
    const encrypted = JSON.parse(jsonStr) as EncryptedData;
    
    // 4. Decrypt the field
    const decrypted = await protector.decrypt(encrypted);
    
    // 5. Audit the access
    await protector.auditAccess(userId, 'decrypt', field);
    
    // 6. Return decrypted field
    return decrypted;
  }
  
  /**
   * Mask a field based on its classification and type
   */
  static maskField(
    value: any, 
    field: string,
    classification: DataClassification
  ): string {
    // 1. Get field protection strategy
    const protector = DataProtectionFactory.getProtectionStrategy(classification);
    
    // 2. Apply appropriate masking
    return protector.mask(value);
  }
  
  // Helper methods
  private static async getFieldMetadata(field: string): Promise<FieldMetadata> {
    // Get metadata from schema registry
    return await schemaRegistryService.getFieldMetadata(field);
  }
}
```

## Data-At-Rest Encryption

### Encryption Implementation

The system implements multiple layers of encryption for data at rest:

1. **Database-Level Encryption**:
   ```sql
   -- Example PostgreSQL TDE setup (executed by DB admin)
   -- 1. Enable encryption
   ALTER SYSTEM SET encryption.key_path = '/secure/path/encryption.key';
   
   -- 2. Create encrypted tablespace
   CREATE TABLESPACE encrypted_space 
     LOCATION '/var/lib/postgresql/data/encrypted'
     WITH (encryption_algorithm = 'AES_256_CBC');
   
   -- 3. Create table in encrypted tablespace
   CREATE TABLE sensitive_data (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL,
     data_type VARCHAR(64) NOT NULL,
     encrypted_data TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
   ) TABLESPACE encrypted_space;
   ```

2. **Application-Level Field Encryption**:
   ```typescript
   /**
    * Database repository with encryption
    */
   class SecureUserRepository {
     /**
      * Insert user with encryption
      */
     async insertUser(user: UserInput): Promise<User> {
       // 1. Identify fields requiring encryption
       const sensitiveFields = ['ssn', 'bankAccountNumber', 'healthInfo'];
       const encryptedFields: Record<string, string> = {};
       
       // 2. Encrypt sensitive fields
       for (const field of sensitiveFields) {
         if (user[field]) {
           // Determine classification from metadata
           const classification = await this.getFieldClassification(field);
           encryptedFields[field] = await FieldEncryption.encryptField(
             user[field],
             field,
             classification
           );
         }
       }
       
       // 3. Create record with encrypted fields
       const result = await db.users.create({
         data: {
           ...user,
           // Replace plaintext with encrypted values
           ...sensitiveFields.reduce((acc, field) => {
             if (encryptedFields[field]) {
               acc[field] = encryptedFields[field];
             }
             return acc;
           }, {})
         }
       });
       
       // 4. Return user without sensitive data
       return this.sanitizeUser(result);
     }
     
     /**
      * Retrieve user with decryption
      */
     async getUserById(
       id: string,
       userId: string,
       purpose: string
     ): Promise<User> {
       // 1. Get user record
       const user = await db.users.findUnique({
         where: { id }
       });
       
       if (!user) {
         throw new Error('User not found');
       }
       
       // 2. Identify encrypted fields
       const sensitiveFields = ['ssn', 'bankAccountNumber', 'healthInfo'];
       const decryptedFields: Record<string, any> = {};
       
       // 3. Decrypt fields if access is allowed
       for (const field of sensitiveFields) {
         if (user[field]) {
           try {
             decryptedFields[field] = await FieldEncryption.decryptField(
               user[field],
               field,
               userId,
               purpose
             );
           } catch (error) {
             // If decryption fails or access is denied, use masked value
             const classification = await this.getFieldClassification(field);
             decryptedFields[field] = FieldEncryption.maskField(
               user[field], 
               field,
               classification
             );
           }
         }
       }
       
       // 4. Return user with decrypted fields
       return {
         ...user,
         ...decryptedFields
       };
     }
     
     // Helper methods
     private async getFieldClassification(field: string): Promise<DataClassification> {
       // Get classification from metadata service
       return await schemaRegistryService.getFieldClassification(field);
     }
     
     private sanitizeUser(user: any): User {
       // Remove sensitive fields for general use
       const { ssn, bankAccountNumber, healthInfo, ...rest } = user;
       return rest as User;
     }
   }
   ```

3. **File Storage Encryption**:
   ```typescript
   /**
    * Secure file storage implementation
    */
   class SecureFileStorage {
     /**
      * Store file with encryption
      */
     async storeFile(
       file: Buffer,
       metadata: FileMetadata,
       userId: string
     ): Promise<StoredFile> {
       try {
         // 1. Determine classification based on file metadata
         const classification = this.classifyFile(metadata);
         
         // 2. Get appropriate protection strategy
         const protector = DataProtectionFactory.getProtectionStrategy(classification);
         
         // 3. Encrypt file content
         const encryptedData = await protector.encrypt(file);
         
         // 4. Create file record with metadata
         const fileRecord = await db.files.create({
           data: {
             name: metadata.name,
             mimeType: metadata.mimeType,
             size: metadata.size,
             classification,
             ownerId: userId,
             encryptionData: {
               algorithm: encryptedData.algorithm,
               keyId: encryptedData.keyId,
               iv: encryptedData.iv,
               authTag: encryptedData.authTag,
               aad: encryptedData.aad
             }
           }
         });
         
         // 5. Store encrypted content
         await storageService.putObject({
           bucket: 'secure-files',
           key: fileRecord.id,
           body: encryptedData.data
         });
         
         // 6. Audit file upload
         await protector.auditAccess(userId, 'upload', 'file');
         
         // 7. Return file record
         return {
           id: fileRecord.id,
           name: fileRecord.name,
           mimeType: fileRecord.mimeType,
           size: fileRecord.size,
           createdAt: fileRecord.createdAt
         };
       } catch (error) {
         console.error('File encryption failed:', error);
         throw new Error(`Failed to store encrypted file: ${error.message}`);
       }
     }
     
     /**
      * Retrieve file with decryption
      */
     async getFile(
       fileId: string,
       userId: string,
       purpose: string
     ): Promise<FileContent> {
       try {
         // 1. Get file metadata
         const fileRecord = await db.files.findUnique({
           where: { id: fileId }
         });
         
         if (!fileRecord) {
           throw new Error('File not found');
         }
         
         // 2. Check access permission
         const protector = DataProtectionFactory.getProtectionStrategy(
           fileRecord.classification
         );
         
         const accessAllowed = await protector.validateAccess(userId, purpose);
         
         if (!accessAllowed) {
           throw new Error('Access denied to file');
         }
         
         // 3. Retrieve encrypted content
         const encryptedContent = await storageService.getObject({
           bucket: 'secure-files',
           key: fileId
         });
         
         // 4. Reconstruct encryption data
         const encryptedData: EncryptedData = {
           data: encryptedContent,
           algorithm: fileRecord.encryptionData.algorithm,
           keyId: fileRecord.encryptionData.keyId,
           iv: fileRecord.encryptionData.iv,
           authTag: fileRecord.encryptionData.authTag,
           aad: fileRecord.encryptionData.aad
         };
         
         // 5. Decrypt content
         const decryptedContent = await protector.decrypt(encryptedData);
         
         // 6. Audit file access
         await protector.auditAccess(userId, 'download', 'file');
         
         // 7. Return file content and metadata
         return {
           content: decryptedContent,
           metadata: {
             id: fileRecord.id,
             name: fileRecord.name,
             mimeType: fileRecord.mimeType,
             size: fileRecord.size
           }
         };
       } catch (error) {
         console.error('File decryption failed:', error);
         
         // Audit failed access
         await auditService.logEvent({
           type: 'data_access',
           subtype: 'file_access_failure',
           userId,
           metadata: {
             fileId,
             error: error.message
           }
         });
         
         throw new Error(`Failed to retrieve file: ${error.message}`);
       }
     }
     
     // Helper methods
     private classifyFile(metadata: FileMetadata): DataClassification {
       // Classification logic based on file metadata
       if (metadata.tags?.includes('pii') || 
           metadata.name.toLowerCase().includes('passport') ||
           metadata.name.toLowerCase().includes('license')) {
         return 'restricted';
       }
       
       if (metadata.tags?.includes('confidential') ||
           metadata.name.toLowerCase().includes('contract')) {
         return 'confidential';
       }
       
       // Default classification for unrecognized files
       return 'internal';
     }
   }
   ```

## Encryption Key Management

The system implements a robust key management system:

```typescript
/**
 * Key management implementation
 */
class KeyManager {
  // Key rotation interval in days
  private KEY_ROTATION_INTERVAL = 90; // 90 days
  
  /**
   * Create a new encryption key
   */
  async createKey(
    purpose: string,
    classification: DataClassification
  ): Promise<KeyInfo> {
    try {
      // 1. Generate a secure random key
      const keyMaterial = crypto.randomBytes(32); // 256 bits
      
      // 2. Create key metadata
      const keyId = uuidv4();
      const createdAt = new Date();
      const expiresAt = new Date(
        createdAt.getTime() + this.KEY_ROTATION_INTERVAL * 24 * 60 * 60 * 1000
      );
      
      // 3. Encrypt key material with master key
      const encryptedKey = await this.encryptWithMasterKey(keyMaterial);
      
      // 4. Store key metadata
      await db.encryptionKeys.create({
        data: {
          id: keyId,
          purpose,
          classification,
          keyMaterial: encryptedKey,
          algorithm: 'AES-256-GCM',
          status: 'active',
          version: 1,
          createdAt,
          expiresAt
        }
      });
      
      // 5. Audit key creation
      await auditService.logEvent({
        type: 'key_management',
        subtype: 'key_created',
        metadata: {
          keyId,
          purpose,
          classification,
          expiresAt
        }
      });
      
      // 6. Return key info
      return {
        keyId,
        purpose,
        classification,
        expiresAt
      };
    } catch (error) {
      console.error('Key creation failed:', error);
      throw new Error(`Failed to create encryption key: ${error.message}`);
    }
  }
  
  /**
   * Get the current active key for a specific purpose
   */
  async getCurrentKey(
    purpose: string,
    classification: DataClassification
  ): Promise<DecryptedKey> {
    // 1. Find active key
    const keyRecord = await db.encryptionKeys.findFirst({
      where: {
        purpose,
        classification,
        status: 'active',
        expiresAt: {
          gt: new Date() // Not expired
        }
      },
      orderBy: {
        createdAt: 'desc' // Get newest
      }
    });
    
    if (!keyRecord) {
      // No valid key found, create a new one
      const newKeyInfo = await this.createKey(purpose, classification);
      return this.getKeyById(newKeyInfo.keyId);
    }
    
    // 2. Check if key is nearing expiration and needs rotation
    const now = new Date();
    const timeToExpiration = keyRecord.expiresAt.getTime() - now.getTime();
    const daysTillExpiration = timeToExpiration / (24 * 60 * 60 * 1000);
    
    // Rotate key if it's within 10% of its lifetime
    if (daysTillExpiration < (this.KEY_ROTATION_INTERVAL * 0.1)) {
      // Schedule key rotation in the background
      this.scheduleKeyRotation(purpose, classification);
    }
    
    // 3. Decrypt key material
    const keyMaterial = await this.decryptWithMasterKey(keyRecord.keyMaterial);
    
    // 4. Return key information
    return {
      keyId: keyRecord.id,
      key: keyMaterial,
      algorithm: keyRecord.algorithm
    };
  }
  
  /**
   * Get an encryption key by ID
   */
  async getKeyById(keyId: string): Promise<DecryptedKey> {
    // 1. Find key by ID
    const keyRecord = await db.encryptionKeys.findUnique({
      where: { id: keyId }
    });
    
    if (!keyRecord) {
      throw new Error(`Key not found: ${keyId}`);
    }
    
    // 2. Check key status
    if (keyRecord.status === 'revoked') {
      throw new Error(`Key ${keyId} has been revoked`);
    }
    
    // 3. Decrypt key material
    const keyMaterial = await this.decryptWithMasterKey(keyRecord.keyMaterial);
    
    // 4. Audit key access
    await auditService.logEvent({
      type: 'key_management',
      subtype: 'key_accessed',
      metadata: {
        keyId,
        purpose: keyRecord.purpose
      }
    });
    
    // 5. Return key information
    return {
      keyId: keyRecord.id,
      key: keyMaterial,
      algorithm: keyRecord.algorithm
    };
  }
  
  /**
   * Rotate encryption keys
   */
  async rotateKey(
    purpose: string,
    classification: DataClassification
  ): Promise<KeyRotationResult> {
    try {
      // 1. Create new key
      const newKeyInfo = await this.createKey(purpose, classification);
      
      // 2. Find current active key
      const currentKey = await db.encryptionKeys.findFirst({
        where: {
          purpose,
          classification,
          status: 'active',
          id: { not: newKeyInfo.keyId }
        }
      });
      
      // 3. If there's a current key, mark it for retirement
      if (currentKey) {
        await db.encryptionKeys.update({
          where: { id: currentKey.id },
          data: {
            status: 'retiring',
            retirementDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
          }
        });
      }
      
      // 4. Schedule reencryption of data using old keys
      if (currentKey) {
        await this.scheduleDataReencryption(
          currentKey.id,
          newKeyInfo.keyId,
          purpose,
          classification
        );
      }
      
      // 5. Audit key rotation
      await auditService.logEvent({
        type: 'key_management',
        subtype: 'key_rotated',
        metadata: {
          oldKeyId: currentKey?.id,
          newKeyId: newKeyInfo.keyId,
          purpose,
          classification
        }
      });
      
      // 6. Return rotation result
      return {
        oldKeyId: currentKey?.id,
        newKeyId: newKeyInfo.keyId,
        reencryptionScheduled: !!currentKey
      };
    } catch (error) {
      console.error('Key rotation failed:', error);
      throw new Error(`Failed to rotate encryption key: ${error.message}`);
    }
  }
  
  // Helper methods (implementation details omitted)
  private async encryptWithMasterKey(keyMaterial: Buffer): Promise<string> { /* ... */ }
  private async decryptWithMasterKey(encryptedKey: string): Promise<Buffer> { /* ... */ }
  private async scheduleKeyRotation(
    purpose: string,
    classification: DataClassification
  ): Promise<void> { /* ... */ }
  private async scheduleDataReencryption(
    oldKeyId: string,
    newKeyId: string,
    purpose: string,
    classification: DataClassification
  ): Promise<void> { /* ... */ }
}
```

## Data-in-Transit Protection

### TLS Configuration

The system implements multiple layers of protection for data in transit:

1. **TLS Configuration**:
   ```javascript
   /**
    * TLS configuration implementation
    */
   const tlsConfig = {
     // 1. Minimum TLS version
     minVersion: 'TLSv1.2',
     
     // 2. Preferred ciphers (in descending priority)
     ciphers: [
       'TLS_AES_256_GCM_SHA384',           // TLS 1.3
       'TLS_AES_128_GCM_SHA256',           // TLS 1.3
       'ECDHE-RSA-AES256-GCM-SHA384',      // TLS 1.2
       'ECDHE-RSA-AES128-GCM-SHA256',      // TLS 1.2
       'ECDHE-RSA-CHACHA20-POLY1305-SHA256' // TLS 1.2
     ].join(':'),
     
     // 3. Certificate configuration
     cert: fs.readFileSync('/path/to/cert.pem'),
     key: fs.readFileSync('/path/to/key.pem'),
     
     // 4. ECDH parameters for perfect forward secrecy
     ecdhCurve: 'prime256v1',
     
     // 5. HTTP Strict Transport Security options
     requestCert: false,
     rejectUnauthorized: true
   };
   
   // Create HTTPS server with secure configuration
   const server = https.createServer(tlsConfig, app);
   ```

2. **Security Headers**:
   ```typescript
   /**
    * Security headers middleware implementation
    */
   function securityHeaders() {
     return (req: Request, res: Response, next: NextFunction) => {
       // 1. HTTP Strict Transport Security
       // Max age: 2 years in seconds
       res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
       
       // 2. Content-Security-Policy
       res.setHeader('Content-Security-Policy', 
         "default-src 'self'; " +
         "script-src 'self'; " +
         "connect-src 'self' https://api.example.com; " +
         "img-src 'self' data:; " +
         "style-src 'self' 'unsafe-inline'; " +
         "font-src 'self'; " +
         "frame-ancestors 'none'; " +
         "form-action 'self';"
       );
       
       // 3. X-Content-Type-Options
       res.setHeader('X-Content-Type-Options', 'nosniff');
       
       // 4. X-Frame-Options
       res.setHeader('X-Frame-Options', 'DENY');
       
       // 5. X-XSS-Protection
       res.setHeader('X-XSS-Protection', '1; mode=block');
       
       // 6. Referrer-Policy
       res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
       
       // 7. Permissions-Policy (formerly Feature-Policy)
       res.setHeader('Permissions-Policy', 
         'camera=(), microphone=(), geolocation=(), interest-cohort=()'
       );
       
       next();
     };
   }
   
   // Apply middleware to Express app
   app.use(securityHeaders());
   ```

3. **API Request/Response Encryption**:
   ```typescript
   /**
    * API payload encryption implementation
    */
   class SecureApiTransport {
     // Session key lifetime in milliseconds
     private SESSION_KEY_LIFETIME = 15 * 60 * 1000; // 15 minutes
     
     // Session key storage
     private sessionKeys: Map<string, {
       key: Buffer,
       expiresAt: number
     }> = new Map();
     
     /**
      * Generate session key for client
      */
     async generateSessionKey(clientId: string): Promise<SessionKeyResponse> {
       // 1. Generate random session key
       const sessionKey = crypto.randomBytes(32);
       
       // 2. Get client's public key
       const clientKey = await this.getClientPublicKey(clientId);
       
       // 3. Encrypt session key with client's public key
       const encryptedSessionKey = crypto.publicEncrypt(
         {
           key: clientKey,
           padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
           oaepHash: 'sha256'
         },
         sessionKey
       );
       
       // 4. Calculate expiration time
       const expiresAt = Date.now() + this.SESSION_KEY_LIFETIME;
       
       // 5. Store session key
       this.sessionKeys.set(clientId, {
         key: sessionKey,
         expiresAt
       });
       
       // 6. Generate session ID
       const sessionId = uuidv4();
       
       // 7. Return encrypted session key
       return {
         sessionId,
         encryptedKey: encryptedSessionKey.toString('base64'),
         expiresAt: new Date(expiresAt).toISOString()
       };
     }
     
     /**
      * Encrypt API payload
      */
     async encryptPayload(
       payload: any,
       clientId: string,
       sessionId: string
     ): Promise<EncryptedApiPayload> {
       // 1. Get session key
       const sessionKey = this.getSessionKey(clientId);
       
       // 2. Generate IV
       const iv = crypto.randomBytes(16);
       
       // 3. Create cipher
       const cipher = crypto.createCipheriv('aes-256-gcm', sessionKey, iv);
       
       // 4. Encrypt payload
       const payloadStr = JSON.stringify(payload);
       let encrypted = cipher.update(payloadStr, 'utf8', 'hex');
       encrypted += cipher.final('hex');
       
       // 5. Get auth tag
       const authTag = cipher.getAuthTag();
       
       // 6. Return encrypted payload
       return {
         encryptedData: encrypted,
         iv: iv.toString('hex'),
         authTag: authTag.toString('hex'),
         sessionId
       };
     }
     
     /**
      * Decrypt API payload
      */
     async decryptPayload(
       encryptedPayload: EncryptedApiPayload,
       clientId: string
     ): Promise<any> {
       try {
         // 1. Get session key
         const sessionKey = this.getSessionKey(clientId);
         
         // 2. Prepare decipher
         const iv = Buffer.from(encryptedPayload.iv, 'hex');
         const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
         
         const decipher = crypto.createDecipheriv('aes-256-gcm', sessionKey, iv);
         decipher.setAuthTag(authTag);
         
         // 3. Decrypt payload
         let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
         decrypted += decipher.final('utf8');
         
         // 4. Parse and return
         return JSON.parse(decrypted);
       } catch (error) {
         console.error('API payload decryption failed:', error);
         throw new Error(`Failed to decrypt API payload: ${error.message}`);
       }
     }
     
     // Helper methods
     private async getClientPublicKey(clientId: string): Promise<string> {
       const clientRecord = await db.apiClients.findUnique({
         where: { id: clientId },
         select: { publicKey: true }
       });
       
       if (!clientRecord) {
         throw new Error(`Client not found: ${clientId}`);
       }
       
       return clientRecord.publicKey;
     }
     
     private getSessionKey(clientId: string): Buffer {
       const session = this.sessionKeys.get(clientId);
       
       if (!session) {
         throw new Error(`No session found for client ${clientId}`);
       }
       
       if (session.expiresAt < Date.now()) {
         this.sessionKeys.delete(clientId);
         throw new Error('Session key expired');
       }
       
       return session.key;
     }
   }
   ```

## PII Data Handling

The system implements specific protections for personally identifiable information:

```typescript
/**
 * PII handling implementation
 */
class PIIHandler {
  // List of field names considered PII
  private PII_FIELDS = [
    'fullName', 'firstName', 'lastName', 'email', 'phone', 'address',
    'ssn', 'dob', 'passport', 'driverLicense', 'bankAccount', 'creditCard'
  ];
  
  /**
   * Detect PII in unstructured data
   */
  detectPII(text: string): PIIDetectionResult {
    const detectedPII: Record<string, string[]> = {};
    
    // 1. Pattern matching for common PII formats
    const patterns = {
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      ssn: /\b(?!000|666|9\d{2})(?!0{3})\d{3}-(?!00)\d{2}-(?!0{4})\d{4}\b/g,
      phone: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
      creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
      zip: /\b\d{5}(?:-\d{4})?\b/g
    };
    
    // 2. Execute pattern matching
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        detectedPII[type] = matches;
      }
    }
    
    // 3. NER for name detection (simplified - would use NLP in real implementation)
    const nameMatches = this.detectNames(text);
    if (nameMatches.length > 0) {
      detectedPII['name'] = nameMatches;
    }
    
    // 4. Calculate confidence level
    const confidenceLevel = this.calculateConfidence(detectedPII);
    
    // 5. Return detection results
    return {
      hasPII: Object.keys(detectedPII).length > 0,
      detectedTypes: Object.keys(detectedPII),
      matches: detectedPII,
      confidenceLevel
    };
  }
  
  /**
   * Sanitize PII from unstructured data
   */
  sanitizePII(text: string, options: PIISanitizationOptions = {}): string {
    // 1. Detect PII
    const detection = this.detectPII(text);
    
    // 2. If no PII found, return original text
    if (!detection.hasPII) {
      return text;
    }
    
    let sanitized = text;
    
    // 3. Replace each detected PII
    for (const [type, matches] of Object.entries(detection.matches)) {
      for (const match of matches) {
        // Default mask character
        const maskChar = options.maskChar || '*';
        
        // Use appropriate replacement strategy based on PII type
        let replacement: string;
        
        switch (type) {
          case 'email':
            // For email, keep domain part visible if specified
            if (options.partiallyVisible) {
              const [local, domain] = match.split('@');
              replacement = `${local[0]}***@${domain}`;
            } else {
              replacement = `${maskChar.repeat(match.length)}`;
            }
            break;
            
          case 'phone':
            // For phone, keep last 4 digits visible if specified
            if (options.partiallyVisible) {
              const digits = match.replace(/\D/g, '');
              const lastFour = digits.slice(-4);
              replacement = `${maskChar.repeat(digits.length - 4)}${lastFour}`;
            } else {
              replacement = `${maskChar.repeat(match.length)}`;
            }
            break;
            
          case 'creditCard':
            // For credit card, always keep last 4 digits visible
            const clean = match.replace(/\D/g, '');
            replacement = `${maskChar.repeat(clean.length - 4)}${clean.slice(-4)}`;
            break;
            
          default:
            // For other PII types, mask completely
            replacement = `${maskChar.repeat(match.length)}`;
        }
        
        // Replace PII with mask
        sanitized = sanitized.replace(match, replacement);
      }
    }
    
    // 4. Return sanitized text
    return sanitized;
  }
  
  /**
   * Sanitize PII from structured data
   */
  sanitizeStructuredData(
    data: Record<string, any>,
    options: StructuredPIISanitizationOptions = {}
  ): Record<string, any> {
    // 1. Create a copy of the data
    const sanitized = { ...data };
    
    // 2. Define fields to process
    const fieldsToCheck = options.fields || this.PII_FIELDS;
    
    // 3. Process each field
    for (const field of fieldsToCheck) {
      if (sanitized[field] !== undefined) {
        const value = sanitized[field];
        
        // Skip fields explicitly excluded
        if (options.exclude && options.exclude.includes(field)) {
          continue;
        }
        
        // Handle based on field type
        if (typeof value === 'string') {
          const protector = DataProtectionFactory.getProtectionStrategy('restricted');
          sanitized[field] = protector.mask(value);
        } else if (Array.isArray(value)) {
          sanitized[field] = value.map(item => 
            typeof item === 'string' ? this.sanitizePII(item, options) : item
          );
        } else if (typeof value === 'object' && value !== null) {
          // Recursively sanitize nested objects
          sanitized[field] = this.sanitizeStructuredData(value, options);
        }
      }
    }
    
    // 4. Return sanitized data
    return sanitized;
  }
  
  // Helper methods (implementation details omitted)
  private detectNames(text: string): string[] { /* ... */ }
  private calculateConfidence(detections: Record<string, string[]>): number { /* ... */ }
}
```

## Related Documentation

For more detailed information about data protection integration with other components:

- **[../audit/PII_PROTECTION.md](../audit/PII_PROTECTION.md)**: PII handling in audit logs
- **[COMMUNICATION_SECURITY.md](COMMUNICATION_SECURITY.md)**: Transport-level security
- **[../RBAC_SYSTEM.md](../RBAC_SYSTEM.md)**: Permission-based access to data
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: How data access is audited
- **[SECURITY_TESTING.md](SECURITY_TESTING.md)**: Testing data protection controls
- **[../CORE_ARCHITECTURE.md](../CORE_ARCHITECTURE.md)**: How data protection fits into overall system

## Version History

- **2.0.0**: Added detailed implementation algorithms for field encryption, key management, and PII handling
- **1.1.0**: Enhanced cross-references and added key rotation details
- **1.0.2**: Updated references to consistently describe direct permission assignment model
- **1.0.1**: Added integration points with audit logging system
- **1.0.0**: Initial document structure
