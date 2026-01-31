# Middleware Module

## What This Module Teaches

This module demonstrates **Express middleware patterns** for security, rate limiting, and request handling. Middleware functions sit between the incoming request and the final route handler.

## Key Concepts

### 1. What is Middleware?

Middleware functions have access to:
- **req** - Request object
- **res** - Response object
- **next** - Next middleware function

They can:
- Execute code
- Modify req/res objects
- End request-response cycle
- Call next() to pass control

### 2. Middleware Order

Middleware executes in the order it's defined:

```typescript
app.use(middleware1);  // Runs first
app.use(middleware2);  // Runs second
app.get('/route', handler);  // Runs last
```

### 3. Middleware Types

- **Application-level** - Applied to all routes
- **Router-level** - Applied to specific routes
- **Error-handling** - Takes 4 arguments (err, req, res, next)
- **Built-in** - Express built-in middleware (express.json, etc.)

## Files in This Directory

### [`rateLimit.ts`](rateLimit.ts)

Rate limiting using token bucket algorithm:
- **Token bucket** - Accurate rate limiting
- **Per-user limits** - Fair resource allocation
- **Gradual slowdown** - User-friendly throttling
- **Configurable** - Windows, limits, handlers

### [`security.ts`](security.ts)

Security-related middleware:
- **Helmet.js** - Security headers
- **CORS** - Cross-origin controls
- **Size limits** - Prevent DoS attacks
- **Content type validation** - Ensure proper formats
- **Query validation** - Prevent injection attacks

## Rate Limiting

### Why Rate Limit?

- Prevent API abuse
- Ensure fair usage
- Protect against DDoS
- Manage server load
- Control costs

### Token Bucket Algorithm

```typescript
interface TokenBucket {
  tokens: number;      // Current tokens
  lastUpdate: number;  // Last refill time
}

// Refill tokens based on elapsed time
function refillTokens(bucket, maxTokens, refillRate) {
  const now = Date.now();
  const elapsed = now - bucket.lastUpdate;

  const tokensToAdd = elapsed * refillRate;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
  bucket.lastUpdate = now;

  return bucket.tokens;
}
```

### Using Rate Limiter

```typescript
import { createRateLimiter } from './rateLimit.js';

// Strict rate limit for mutations
const mutationLimit = createRateLimiter({
  windowMs: 10_000,  // 10 seconds
  maxRequests: 20,    // 20 requests per window
});

app.post('/reserve', mutationLimit, handler);
```

### Rate Limit Response

When limit exceeded:

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
Retry-After: 5
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706716800000

{
  "ok": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please retry after 5 seconds.",
    "details": {
      "retryAfter": 5,
      "resetTime": 1706716800000
    }
  }
}
```

### Gradual Slowdown

More user-friendly than hard limits:

```typescript
import { createSlowDown } from './rateLimit.js';

const slowDown = createSlowDown({
  windowMs: 10_000,
  delayAfter: 10,    // Start delaying after 10 requests
  delayMs: 500,      // Delay by 500ms per request
  maxDelayMs: 2000,  // Cap at 2 seconds
});

app.use(slowDown);
```

Request progression:
- Request 1-10: No delay
- Request 11: +500ms delay
- Request 12: +1000ms delay
- Request 13+: +2000ms delay (capped)

### Per-User Rate Limiting

Limit by user instead of IP:

```typescript
const userRateLimit = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
  keyGenerator: (req) => {
    return req.body.userId || req.ip;
  }
});
```

### Skip Rate Limiting

Whitelist trusted users:

```typescript
const rateLimiter = createRateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
  skip: (req) => {
    // Skip for admin users
    return req.headers['x-api-key'] === process.env.ADMIN_KEY;
  }
});
```

## Security Middleware

### Helmet.js - Security Headers

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
    }
  },
  hsts: {
    maxAge: 31536000,  // 1 year
    includeSubDomains: true,
  }
}));
```

**Headers set**:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: ...`

### CORS Configuration

```typescript
import cors from 'cors';

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = ['https://example.com', 'https://app.example.com'];

    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));
```

### Request Size Limits

Prevent DoS attacks:

```typescript
app.use((req, res, next) => {
  const contentLength = req.headers['content-length'];
  const maxSize = 1024 * 1024; // 1MB

  if (contentLength && parseInt(contentLength) > maxSize) {
    return res.status(413).json({
      ok: false,
      error: {
        code: 'REQUEST_TOO_LARGE',
        message: 'Request body too large'
      }
    });
  }

  next();
});
```

### Content Type Validation

Ensure proper content types:

```typescript
app.use(validateContentType(['application/json']));

// Rejects requests without proper Content-Type
```

### Query String Validation

Prevent injection attacks:

```typescript
const dangerousPatterns = [
  /(<script|javascript:)/i,           // XSS
  /(union\s+select|drop\s+table)/i,  // SQL injection
  /(\.\.\/|\.\.\\)/,                  // Path traversal
];

app.use((req, res, next) => {
  for (const [key, value] of Object.entries(req.query)) {
    for (const pattern of dangerousPatterns) {
      if (pattern.test(value)) {
        return res.status(400).json({
          ok: false,
          error: { code: 'INVALID_QUERY_STRING' }
        });
      }
    }
  }
  next();
});
```

## Applying Middleware

### Apply All Security Middleware

```typescript
import { applySecurityMiddleware } from './security.js';

applySecurityMiddleware(app);

// Applies:
// - Helmet (security headers)
// - CORS
// - Size limits
// - Content type validation
// - Query validation
// - Security headers
```

### Apply to Specific Routes

```typescript
// Public routes - lenient rate limit
app.get('/items',
  lenientRateLimiter,
  getItemsHandler
);

// Mutation routes - strict rate limit + idempotency
app.post('/reserve',
  strictRateLimiter,
  idempotencyMiddleware('/reserve'),
  reserveHandler
);
```

### Conditional Middleware

```typescript
// Apply only in production
if (appConfig.isProduction) {
  app.use(strictRateLimiter);
  app.use(helmet({ hsts: true }));
}
```

## Request ID Middleware

Track requests across logs:

```typescript
export function requestIdMiddleware(req, res, next) {
  // Get or generate request ID
  req.requestId = req.headers['x-request-id'] || crypto.randomUUID();

  // Add to response headers
  res.setHeader('x-request-id', req.requestId);

  // Add to logger context
  req.log = logger.child({ requestId: req.requestId });

  next();
}
```

## Request Logging Middleware

Log all HTTP requests:

```typescript
export function requestLoggingMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs,
      requestId: req.requestId,
    }, `${req.method} ${req.path} ${res.statusCode}`);
  });

  next();
}
```

## Custom Middleware

### Timing Middleware

```typescript
export function timingMiddleware(req, res, next) {
  req.startTime = Date.now();
  next();
}

// Later...
const duration = Date.now() - req.startTime;
```

### Authentication Middleware

```typescript
export function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];

  if (!token) {
    return unauthorized(res, req, 'Missing authentication token');
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch (error) {
    return unauthorized(res, req, 'Invalid token');
  }
}
```

### Error Handler Middleware

```typescript
export function errorHandler(err, req, res, next) {
  logger.error('Request error', err);

  return res.status(err.status || 500).json({
    ok: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong'
    }
  });
}

// Must be added last
app.use(errorHandler);
```

## Related Files

- [`../server.ts`](../server.ts) - Middleware setup and order
- [`../observability/index.ts`](../observability/index.ts) - Request logging
- [`../routes/index.ts`](../routes/index.ts) - Middleware usage in routes

## Best Practices

### ✅ DO

- Apply security middleware first
- Rate limit mutation endpoints
- Validate content types
- Set size limits
- Use request IDs for tracing
- Log suspicious activity

### ❌ DON'T

- Forget error handlers
- Apply rate limiting inconsistently
- Expose stack traces
- Skip security in production
- Use unlimited request sizes

## Testing Middleware

### Test Rate Limiting

```bash
# Make requests until rate limited
for i in {1..25}; do
  curl -X POST http://localhost:3000/api/v1/reserve \
    -H "Content-Type: application/json" \
    -d '{"userId":"user_1","itemId":"item_1","qty":1}'
done

# After 20 requests, you'll get 429 errors
```

### Test Security Headers

```bash
# Check headers
curl -I http://localhost:3000/api/v1/items

# Look for:
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
```

### Test CORS

```bash
# Test CORS preflight
curl -X OPTIONS http://localhost:3000/api/v1/items \
  -H "Origin: https://example.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

---

**💡 Tip**: Use `app.use()` for application middleware and add directly to routes for route-specific middleware!
