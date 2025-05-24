
# Rate Limiting Implementation

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document defines the standardized rate limiting implementation across all application components. Rate limiting is a critical security control that protects the system from abuse, denial of service attacks, and resource exhaustion.

## Rate Limiting Architecture

### Core Principles

1. **Layered Defense**
   - Multiple rate limiting layers (network, application, API)
   - Defense in depth strategy
   - Graduated response to increased load

2. **Context-Aware Limits**
   - Different limits based on authentication status
   - Resource-specific thresholds
   - Tenant-based allocation
   - User role considerations

3. **Transparent Response**
   - Clear feedback on rate limit status
   - Standard response format
   - Inclusion of reset time information
   - Retry-After header usage

## Implementation Standards

### Rate Limit Tiers

| Tier | Authentication Status | Default Limit | Window | Scope |
|------|----------------------|--------------|--------|-------|
| 1 | Unauthenticated | 30 | 1 minute | IP address |
| 2 | Authenticated User | 300 | 1 minute | User ID |
| 3 | Service Account | 3000 | 1 minute | Client ID |
| 4 | Internal Service | 30000 | 1 minute | Service ID |

### Special Endpoints

| Endpoint Type | Example | Limit | Window | Notes |
|--------------|---------|-------|--------|-------|
| Authentication | `/api/auth/*` | 10 | 1 minute | Per IP address |
| Password Reset | `/api/auth/reset-password` | 5 | 30 minutes | Per email address |
| Search | `/api/search` | 60 | 1 minute | Per user ID |
| Export | `/api/export/*` | 10 | 1 hour | Per user ID |
| Admin | `/api/admin/*` | 600 | 1 minute | Per admin user ID |

### Resource-Specific Limits

```typescript
// Resource limit configuration interface
interface ResourceRateLimit {
  resource: string;
  unauthenticatedLimit: {
    requests: number;
    window: number; // seconds
  };
  authenticatedLimit: {
    requests: number;
    window: number; // seconds
    byRole?: Record<string, {
      requests: number;
      window: number; // seconds
    }>;
  };
  scope: 'ip' | 'user' | 'tenant' | 'global';
  errorResponse: {
    status: number;
    message: string;
  };
}

// Example resource rate limit configuration
const resourceLimits: ResourceRateLimit[] = [
  {
    resource: 'api/users',
    unauthenticatedLimit: {
      requests: 0, // Disallow completely
      window: 60,
    },
    authenticatedLimit: {
      requests: 100,
      window: 60,
      byRole: {
        admin: {
          requests: 1000,
          window: 60,
        },
      },
    },
    scope: 'user',
    errorResponse: {
      status: 429,
      message: 'Too many user management requests, please try again later',
    },
  },
  {
    resource: 'api/search',
    unauthenticatedLimit: {
      requests: 10,
      window: 60,
    },
    authenticatedLimit: {
      requests: 60,
      window: 60,
      byRole: {
        premium: {
          requests: 120,
          window: 60,
        },
      },
    },
    scope: 'ip',
    errorResponse: {
      status: 429,
      message: 'Search rate limit exceeded, please try again later',
    },
  },
]
```

## Technical Implementation

### Rate Limiting Middleware

```typescript
// Rate limiting middleware with standardized implementation
function rateLimitMiddleware(options: {
  resource?: string;
  limit?: number;
  window?: number; // seconds
  scope?: 'ip' | 'user' | 'tenant' | 'global';
  keyGenerator?: (req: Request) => string;
}) {
  const {
    resource,
    limit: defaultLimit = 60,
    window: defaultWindow = 60,
    scope = 'ip',
    keyGenerator,
  } = options;

  // Default key generators based on scope
  const defaultKeyGenerators = {
    ip: (req: Request) => req.ip || '127.0.0.1',
    user: (req: Request) => req.user?.id || req.ip || '127.0.0.1',
    tenant: (req: Request) => req.user?.tenantId || req.ip || '127.0.0.1',
    global: () => 'global',
  };

  // Use custom key generator or default based on scope
  const getKey = keyGenerator || defaultKeyGenerators[scope];

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `rate-limit:${resource || req.path}:${getKey(req)}`;
    
    try {
      // Get current count from store
      const current = await rateLimitStore.get(key) || 0;
      
      // Check if limit exceeded
      if (current >= defaultLimit) {
        // Get remaining time in window
        const ttl = await rateLimitStore.ttl(key);
        
        // Set rate limit headers
        res.set('X-RateLimit-Limit', defaultLimit.toString());
        res.set('X-RateLimit-Remaining', '0');
        res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + ttl).toString());
        res.set('Retry-After', Math.ceil(ttl).toString());
        
        // Return standard rate limit exceeded response
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(ttl),
        });
      }
      
      // Increment counter
      await rateLimitStore.increment(key);
      
      // Set TTL if first request in window
      if (current === 0) {
        await rateLimitStore.expire(key, defaultWindow);
      }
      
      // Set rate limit headers
      res.set('X-RateLimit-Limit', defaultLimit.toString());
      res.set('X-RateLimit-Remaining', (defaultLimit - current - 1).toString());
      res.set('X-RateLimit-Reset', Math.floor(Date.now() / 1000 + await rateLimitStore.ttl(key)).toString());
      
      // Continue to next middleware
      next();
    } catch (error) {
      // In case of store failure, allow request but log error
      console.error('Rate limiting error:', error);
      next();
    }
  };
}
```

### Dynamic Rate Limit Resolution

```typescript
// Dynamic rate limit resolution middleware
function dynamicRateLimitMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Determine resource being accessed
      const resource = req.path;
      
      // Find matching resource configuration
      const resourceConfig = resourceLimits.find(config => 
        resource.startsWith(config.resource)
      );
      
      if (!resourceConfig) {
        // Default rate limiting for unspecified resources
        return rateLimitMiddleware({})(req, res, next);
      }
      
      // Determine authentication status
      const isAuthenticated = !!req.user;
      
      // Get appropriate limit configuration
      const limitConfig = isAuthenticated 
        ? resourceConfig.authenticatedLimit
        : resourceConfig.unauthenticatedLimit;
      
      // Check for role-specific limits
      let finalLimit = limitConfig.requests;
      let finalWindow = limitConfig.window;
      
      if (isAuthenticated && limitConfig.byRole && req.user.roles) {
        // Find highest limit among user's roles
        for (const role of req.user.roles) {
          const roleLimit = limitConfig.byRole[role];
          if (roleLimit && roleLimit.requests > finalLimit) {
            finalLimit = roleLimit.requests;
            finalWindow = roleLimit.window;
          }
        }
      }
      
      // Apply resolved rate limit
      return rateLimitMiddleware({
        resource: resourceConfig.resource,
        limit: finalLimit,
        window: finalWindow,
        scope: resourceConfig.scope,
      })(req, res, next);
      
    } catch (error) {
      // In case of resolution error, use default rate limiting
      console.error('Rate limit resolution error:', error);
      return rateLimitMiddleware({})(req, res, next);
    }
  };
}
```

## Rate Limit Storage

### Redis Implementation

```typescript
// Redis-based rate limit store
class RedisRateLimitStore {
  private client: Redis;
  
  constructor(redisClient: Redis) {
    this.client = redisClient;
  }
  
  async get(key: string): Promise<number> {
    const value = await this.client.get(key);
    return value ? parseInt(value, 10) : 0;
  }
  
  async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }
  
  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }
  
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
```

### Memory Implementation (Development)

```typescript
// In-memory rate limit store for development
class MemoryRateLimitStore {
  private store: Map<string, { count: number; expires: number }> = new Map();
  
  async get(key: string): Promise<number> {
    const item = this.store.get(key);
    
    if (!item) {
      return 0;
    }
    
    // Check expiration
    if (item.expires < Date.now()) {
      this.store.delete(key);
      return 0;
    }
    
    return item.count;
  }
  
  async increment(key: string): Promise<number> {
    const item = this.store.get(key) || { count: 0, expires: Date.now() + 60000 };
    item.count += 1;
    this.store.set(key, item);
    return item.count;
  }
  
  async expire(key: string, seconds: number): Promise<void> {
    const item = this.store.get(key);
    if (item) {
      item.expires = Date.now() + (seconds * 1000);
      this.store.set(key, item);
    }
  }
  
  async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) {
      return 0;
    }
    
    const ttl = Math.floor((item.expires - Date.now()) / 1000);
    return ttl > 0 ? ttl : 0;
  }
}
```

## Burst Handling

### Token Bucket Implementation

```typescript
// Token bucket rate limiter for handling bursts
class TokenBucketRateLimiter {
  private capacity: number;
  private refillRate: number; // tokens per second
  private store: RateLimitStore;
  
  constructor(
    capacity: number, 
    refillRate: number,
    store: RateLimitStore
  ) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.store = store;
  }
  
  async consume(key: string, tokens: number = 1): Promise<boolean> {
    const bucketKey = `token-bucket:${key}`;
    const timestamp = Date.now();
    
    // Get current bucket state or create new
    const rawBucket = await this.store.get(bucketKey);
    const bucket = rawBucket ? JSON.parse(rawBucket) : {
      tokens: this.capacity,
      lastRefill: timestamp
    };
    
    // Refill tokens based on time passed
    const timePassedSeconds = (timestamp - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.capacity,
      bucket.tokens + (timePassedSeconds * this.refillRate)
    );
    bucket.lastRefill = timestamp;
    
    // Check if enough tokens available
    if (bucket.tokens < tokens) {
      await this.store.set(bucketKey, JSON.stringify(bucket));
      return false;
    }
    
    // Consume tokens
    bucket.tokens -= tokens;
    await this.store.set(bucketKey, JSON.stringify(bucket));
    return true;
  }
}
```

## API Rate Limit Configuration

### Express API Configuration

```typescript
// API rate limit configuration for Express
function configureApiRateLimits(app: Express) {
  // Global rate limit
  app.use(rateLimitMiddleware({
    limit: 1000,
    window: 60,
    scope: 'ip'
  }));
  
  // Authentication endpoints
  app.use('/api/auth', rateLimitMiddleware({
    limit: 10,
    window: 60,
    scope: 'ip'
  }));
  
  // Search endpoints with higher limits
  app.use('/api/search', rateLimitMiddleware({
    limit: 60,
    window: 60,
    scope: 'user'
  }));
  
  // Admin endpoints
  app.use('/api/admin', rateLimitMiddleware({
    limit: 600,
    window: 60,
    scope: 'user'
  }));
  
  // Dynamic rate limiting for all other routes
  app.use('/api', dynamicRateLimitMiddleware());
}
```

## Monitoring and Alerting

### Rate Limit Metrics

1. **Tracked Metrics**
   - Rate limit hits per endpoint
   - Rate limit hits per user/IP
   - Near-limit utilization (> 80% of limit)
   - Rate limit rejections

2. **Visualization**
   - Real-time dashboard of rate limit utilization
   - Historical trends by endpoint
   - User/IP rate limit patterns
   - Alert history

### Alert Thresholds

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Rejection Rate | >10% of requests rejected in 5 minutes | Warning | Notification |
| Sustained High Rejection | >20% of requests rejected in 15 minutes | High | Notification + Investigation |
| Potential DoS | >50% of global limit from single source in 1 minute | Critical | Notification + Automatic blocking |
| System-wide Rate Limit | >80% of system capacity in 5 minutes | Critical | Notification + Scale up |

## Abuse Prevention

### Automated Response

1. **Progressive Rate Limiting**
   - Gradual reduction of limits for abusive clients
   - Exponential backoff for repeated violations
   - Temporary to permanent blocks for persistent abuse

2. **IP Reputation Tracking**
   - Score-based system for client trustworthiness
   - Integration with IP reputation services
   - Historical violation tracking
   - Rehabilitation path for improved behavior

## Multi-tenant Considerations

### Tenant Isolation

1. **Tenant Resource Allocation**
   - Separate rate limit pools per tenant
   - Tenant-specific limit customization
   - Tenant admin configuration capability

2. **Fair Share Enforcement**
   - Prevention of tenant resource monopolization
   - Balancing between tenant needs
   - Tenant service tier differentiation

## Testing and Validation

### Rate Limit Testing

1. **Functional Testing**
   - Verification of limit enforcement
   - Header presence and correctness
   - Response format validation

2. **Stress Testing**
   - Limit boundary testing
   - Burst handling verification
   - System behavior under limit saturation

## Related Documentation

- **[INPUT_VALIDATION.md](INPUT_VALIDATION.md)**: Input validation patterns
- **[API_SECURITY.md](API_SECURITY.md)**: API security controls
- **[ERROR_HANDLING.md](ERROR_HANDLING.md)**: Error handling standards
- **[../implementation/testing/LOAD_TESTING.md](../implementation/testing/LOAD_TESTING.md)**: Load testing strategy

## Version History

- **1.0.0**: Initial rate limiting implementation document (2025-05-23)
