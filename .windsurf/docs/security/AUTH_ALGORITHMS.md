
# Authentication Algorithms

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document details the specific algorithms implemented for authentication, token handling, and session management.

## Authentication Implementation Algorithm

The JWT-based authentication system implements this precise algorithm:

```typescript
// Authentication flow implementation
function authenticateUser(email: string, password: string): Promise<Session> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Validate inputs with Zod schema
      const authSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8)
      });
      
      const validationResult = authSchema.safeParse({ email, password });
      if (!validationResult.success) {
        throw new Error('Invalid credentials format');
      }
      
      // 2. Rate limiting check
      const ipAddress = getClientIPAddress();
      const rateLimitResult = await checkRateLimit(ipAddress, 'login');
      if (!rateLimitResult.allowed) {
        throw new Error(`Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds`);
      }
      
      // 3. Password verification
      const user = await getUserByEmail(email);
      if (!user) {
        // Use constant-time comparison even for non-existent users to prevent timing attacks
        await comparePassword('dummy-password-hash', password);
        throw new Error('Invalid email or password');
      }
      
      const passwordValid = await comparePassword(user.passwordHash, password);
      if (!passwordValid) {
        // 4. Audit failed login attempt
        await auditSecurityEvent({
          type: 'authentication',
          subtype: 'login_failure',
          userId: user.id,
          metadata: { reason: 'invalid_password' }
        });
        throw new Error('Invalid email or password');
      }
      
      // 5. Check account status
      if (user.status !== 'active') {
        await auditSecurityEvent({
          type: 'authentication',
          subtype: 'login_blocked',
          userId: user.id,
          metadata: { reason: user.status }
        });
        throw new Error(`Account is ${user.status}`);
      }
      
      // 6. Generate JWT and refresh token
      const session = await createSession(user);
      
      // 7. Audit successful login
      await auditSecurityEvent({
        type: 'authentication',
        subtype: 'login_success',
        userId: user.id,
        sessionId: session.id
      });
      
      // 8. Return session
      resolve(session);
    } catch (error) {
      // 9. Handle errors consistently
      reject(error);
    }
  });
}
```

## Refresh Token Implementation

The token refresh system implements this algorithm:

```typescript
// Refresh token implementation
function refreshUserSession(refreshToken: string): Promise<Session> {
  return new Promise(async (resolve, reject) => {
    try {
      // 1. Validate refresh token format
      if (!refreshToken || typeof refreshToken !== 'string') {
        throw new Error('Invalid refresh token format');
      }
      
      // 2. Verify token in database
      const existingSession = await getSessionByRefreshToken(refreshToken);
      if (!existingSession) {
        throw new Error('Invalid refresh token');
      }
      
      // 3. Check token expiration
      if (new Date(existingSession.refreshTokenExpiresAt) < new Date()) {
        await invalidateSession(existingSession.id);
        throw new Error('Refresh token expired');
      }
      
      // 4. Check if session was invalidated
      if (existingSession.status !== 'active') {
        throw new Error('Session has been invalidated');
      }
      
      // 5. Generate new tokens with rotation
      const user = await getUserById(existingSession.userId);
      if (!user) {
        throw new Error('User no longer exists');
      }
      
      // 6. Invalidate old refresh token
      await invalidateRefreshToken(refreshToken);
      
      // 7. Create new session
      const newSession = await createSession(user);
      
      // 8. Audit token refresh
      await auditSecurityEvent({
        type: 'authentication',
        subtype: 'token_refresh',
        userId: user.id,
        sessionId: newSession.id,
        metadata: { previousSessionId: existingSession.id }
      });
      
      // 9. Return new session
      resolve(newSession);
    } catch (error) {
      reject(error);
    }
  });
}
```

## Session Creation Algorithm

The session creation process follows this algorithm:

```typescript
// Session creation implementation
async function createSession(user: User): Promise<Session> {
  // 1. Generate session ID
  const sessionId = generateUUID();
  
  // 2. Generate JWT with appropriate claims
  const jwt = await generateJWT({
    sub: user.id,
    jti: sessionId,
    name: user.name,
    email: user.email,
    roles: await getUserRoles(user.id),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + JWT_EXPIRY_SECONDS
  });
  
  // 3. Generate refresh token
  const refreshToken = generateSecureToken();
  const refreshTokenHash = await hashToken(refreshToken);
  
  // 4. Set expiry dates
  const now = new Date();
  const jwtExpiresAt = new Date(now.getTime() + JWT_EXPIRY_SECONDS * 1000);
  const refreshTokenExpiresAt = new Date(now.getTime() + REFRESH_EXPIRY_SECONDS * 1000);
  
  // 5. Store session in database
  const session = await database.query(
    `INSERT INTO user_sessions 
     (id, user_id, refresh_token_hash, jwt_expires_at, refresh_token_expires_at, user_agent, ip_address, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      sessionId,
      user.id,
      refreshTokenHash,
      jwtExpiresAt,
      refreshTokenExpiresAt,
      getCurrentUserAgent(),
      getCurrentIpAddress(),
      'active'
    ]
  );
  
  // 6. Return session with tokens
  return {
    id: session.id,
    token: jwt,
    refreshToken,
    expiresAt: jwtExpiresAt.toISOString(),
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    }
  };
}
```

## JWT Verification Algorithm

The token verification process follows this algorithm:

```typescript
// JWT verification implementation
async function verifyJWT(token: string): Promise<DecodedJWT | null> {
  try {
    // 1. Parse token without verification to get kid (key ID)
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
      return null;
    }
    
    // 2. Get the public key for this key ID
    const publicKey = await getPublicKey(decoded.header.kid);
    if (!publicKey) {
      return null;
    }
    
    // 3. Verify token signature and claims
    const verified = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],
      ignoreExpiration: false
    });
    
    if (typeof verified === 'string') {
      return null;
    }
    
    // 4. Check if token has been revoked
    const isRevoked = await isTokenRevoked(verified.jti);
    if (isRevoked) {
      return null;
    }
    
    // 5. Return decoded token
    return verified as DecodedJWT;
  } catch (error) {
    // 6. Log verification failure
    await auditSecurityEvent({
      type: 'authentication',
      subtype: 'token_verification_failure',
      metadata: { error: error.message }
    });
    
    return null;
  }
}
```

## Password Verification

The password verification algorithm ensures secure password checking:

```typescript
// Password verification implementation
async function comparePassword(storedHash: string, providedPassword: string): Promise<boolean> {
  // 1. Extract algorithm, salt, and hash parts
  const [algorithm, encodedSalt, encodedHash] = storedHash.split('$');
  
  if (!algorithm || !encodedSalt || !encodedHash) {
    throw new Error('Invalid password hash format');
  }
  
  // 2. Decode salt from base64
  const salt = Buffer.from(encodedSalt, 'base64');
  
  // 3. Hash the provided password using the same algorithm and salt
  let derivedHash;
  
  switch (algorithm) {
    case 'argon2id':
      derivedHash = await argon2.hash(providedPassword, {
        salt,
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MB
        timeCost: 3,       // 3 iterations
        parallelism: 4     // 4 parallel threads
      });
      break;
      
    case 'pbkdf2':
      derivedHash = await pbkdf2(
        providedPassword,
        salt,
        100000, // 100k iterations
        64,     // 64 bytes (512 bits)
        'sha512'
      );
      derivedHash = derivedHash.toString('base64');
      break;
      
    default:
      throw new Error(`Unsupported hash algorithm: ${algorithm}`);
  }
  
  // 4. Perform constant-time comparison to prevent timing attacks
  return constantTimeCompare(encodedHash, derivedHash);
}

// Constant-time string comparison
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}
```

## Multi-Factor Authentication

The MFA implementation algorithm:

```typescript
// MFA verification implementation
async function verifyMFA(userId: string, code: string): Promise<boolean> {
  // 1. Get user's MFA settings
  const mfaSettings = await getMFASettings(userId);
  
  if (!mfaSettings || !mfaSettings.enabled) {
    return false;
  }
  
  // 2. Check code based on MFA type
  let isValid = false;
  
  switch (mfaSettings.type) {
    case 'totp':
      isValid = verifyTOTP(mfaSettings.secret, code);
      break;
      
    case 'backup':
      isValid = await verifyAndConsumeBackupCode(userId, code);
      break;
      
    case 'sms':
      isValid = await verifySMSCode(userId, code);
      break;
      
    default:
      return false;
  }
  
  // 3. Audit MFA attempt
  await auditSecurityEvent({
    type: 'authentication',
    subtype: 'mfa_verification',
    userId,
    metadata: {
      type: mfaSettings.type,
      success: isValid
    }
  });
  
  return isValid;
}
```

## Related Documentation

- **[OVERVIEW.md](OVERVIEW.md)**: Security implementation overview
- **[AUTH_SYSTEM.md](AUTH_SYSTEM.md)**: Full authentication system details
- **[PERMISSION_ENFORCEMENT.md](PERMISSION_ENFORCEMENT.md)**: Permission enforcement algorithms
- **[SECURITY_EVENTS.md](SECURITY_EVENTS.md)**: Security event logging
- **[../audit/SECURITY_INTEGRATION.md](../audit/SECURITY_INTEGRATION.md)**: Audit integration

## Version History

- **1.0.0**: Initial document created from OVERVIEW.md refactoring (2025-05-23)
