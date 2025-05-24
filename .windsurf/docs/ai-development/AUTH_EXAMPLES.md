
# Authentication Implementation Examples

> **Version**: 2.0.0  
> **Last Updated**: 2025-05-23

## Overview

Concrete authentication implementation examples for AI development platforms.

## User Authentication Flow

```typescript
// User authentication implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { AuditLogger } from '../services/AuditLogger';

interface AuthResult {
  success: boolean;
  userId?: string;
  error?: string;
  session?: Record<string, any>;
  requiresMFA?: boolean;
}

export class AuthenticationService {
  constructor(
    private supabase: SupabaseClient,
    private auditLogger: AuditLogger
  ) {}
  
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      // 1. Attempt authentication
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        // 2. Log failed attempt
        await this.auditLogger.log({
          eventType: 'authentication',
          action: 'sign_in',
          status: 'failed',
          metadata: {
            reason: error.message,
            email // Redacted in logs
          }
        });
        
        return {
          success: false,
          error: error.message
        };
      }
      
      // 3. Log successful authentication
      await this.auditLogger.log({
        eventType: 'authentication',
        userId: data.user?.id,
        action: 'sign_in',
        status: 'success'
      });
      
      // 4. Return success with session
      return {
        success: true,
        userId: data.user?.id,
        session: data.session
      };
    } catch (e) {
      // 5. Handle unexpected errors
      const error = e as Error;
      
      await this.auditLogger.log({
        eventType: 'authentication',
        action: 'sign_in',
        status: 'error',
        metadata: {
          error: error.message
        }
      });
      
      return {
        success: false,
        error: 'Authentication failed'
      };
    }
  }
  
  async signUp(email: string, password: string, profile?: any): Promise<AuthResult> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: profile
        }
      });
      
      if (error) {
        await this.auditLogger.log({
          eventType: 'authentication',
          action: 'sign_up',
          status: 'failed',
          metadata: { reason: error.message }
        });
        
        return { success: false, error: error.message };
      }
      
      await this.auditLogger.log({
        eventType: 'authentication',
        userId: data.user?.id,
        action: 'sign_up',
        status: 'success'
      });
      
      return {
        success: true,
        userId: data.user?.id,
        session: data.session
      };
    } catch (e) {
      const error = e as Error;
      return { success: false, error: error.message };
    }
  }
  
  async signOut(userId: string): Promise<void> {
    try {
      await this.supabase.auth.signOut();
      
      await this.auditLogger.log({
        eventType: 'authentication',
        userId,
        action: 'sign_out',
        status: 'success'
      });
    } catch (e) {
      const error = e as Error;
      await this.auditLogger.log({
        eventType: 'authentication',
        userId,
        action: 'sign_out',
        status: 'error',
        metadata: { error: error.message }
      });
    }
  }
}
```

## Session Management

```typescript
// Session management with tenant context
export class SessionManager {
  private sessions = new Map<string, SessionData>();
  
  async createSession(userData: {
    userId: string;
    tenantId?: string;
    permissions?: string[];
  }): Promise<string> {
    const sessionId = crypto.randomUUID();
    const session: SessionData = {
      id: sessionId,
      userId: userData.userId,
      tenantId: userData.tenantId,
      permissions: userData.permissions || [],
      createdAt: new Date(),
      lastActivity: new Date(),
      isActive: true
    };
    
    this.sessions.set(sessionId, session);
    
    // Set expiration
    setTimeout(() => {
      this.expireSession(sessionId);
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    return sessionId;
  }
  
  async validateSession(sessionId: string): Promise<SessionData | null> {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }
    
    // Update last activity
    session.lastActivity = new Date();
    this.sessions.set(sessionId, session);
    
    return session;
  }
  
  async expireSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
      this.sessions.set(sessionId, session);
    }
  }
}

interface SessionData {
  id: string;
  userId: string;
  tenantId?: string;
  permissions: string[];
  createdAt: Date;
  lastActivity: Date;
  isActive: boolean;
}
```

## Authentication Middleware

```typescript
// Express middleware for authentication
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  
  try {
    // Validate JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    // Attach user to request
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      tenantId: decoded.tenant_id
    };
    
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// React authentication hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            tenantId: session.user.user_metadata?.tenant_id
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email!,
            tenantId: session.user.user_metadata?.tenant_id
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return { user, loading };
}
```

## Password Security

```typescript
// Password hashing and validation
import bcrypt from 'bcrypt';

export class PasswordService {
  private readonly saltRounds = 12;
  
  async hashPassword(password: string): Promise<string> {
    // Validate password strength first
    this.validatePasswordStrength(password);
    
    return bcrypt.hash(password, this.saltRounds);
  }
  
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
  
  private validatePasswordStrength(password: string): void {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      throw new Error(
        'Password must contain uppercase, lowercase, numbers, and special characters'
      );
    }
  }
}
```

## Related Examples

- **Permission Examples**: `PERMISSION_EXAMPLES.md`
- **Multi-tenant Examples**: `MULTITENANT_EXAMPLES.md`
- **Audit Examples**: `AUDIT_EXAMPLES.md`

These authentication examples provide the foundation for secure user management in the system.
