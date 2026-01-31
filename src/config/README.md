# Configuration Module

## What This Module Teaches

This module demonstrates **environment configuration** and **type-safe settings**.

## Key Concepts

### 1. Environment Variables

Load configuration from environment (`.env` file):
```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### 2. Schema Validation

Validate env vars at startup with Zod:
```typescript
const envSchema = z.object({
  PORT: z.string().transform(Number),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
});
```

### 3. Sensible Defaults

Provide good defaults for development:
```typescript
export const config = {
  PORT: 3000,  // Default if not set
  LOG_LEVEL: 'info',
  ...
};
```

## Files in This Directory

### [`index.ts`](index.ts)

Configuration loading with:
- **Environment validation** - Fail fast on invalid config
- **Derived values** - Computed config (e.g., API base path)
- **Environment detection** - Development vs Production flags

## Important Settings

### Server Configuration

| Setting | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `NODE_ENV` | `development` | Environment mode |

### API Configuration

| Setting | Default | Purpose |
|----------|---------|---------|
| `API_VERSION` | `v1` | API version |
| `API_PREFIX` | `/api` | URL prefix |
| `CORS_ORIGIN` | `*` | Allowed origins |

### Reservation Configuration

| Setting | Default | Purpose |
|----------|---------|---------|
| `RESERVATION_TIMEOUT_MINUTES` | `10` | How long reservations last |

### Cache Configuration

| Setting | Default | Purpose |
|----------|---------|---------|
| `CACHE_TTL_ITEMS` | `30000` | Items cache TTL (30 sec) |
| `CACHE_TTL_DEFAULT` | `5000` | Default cache TTL (5 sec) |

### Database Configuration

| Setting | Default | Purpose |
|----------|---------|---------|
| `DB_PATH` | `./app.db` | SQLite database file path |

## Learning Exercises

### Exercise 1: Change Port

```bash
# Start server on port 4000
PORT=4000 npm run dev
```

### Exercise 2: Enable Production Mode

```bash
NODE_ENV=production npm start
```

### Exercise 3: Change Cache TTL

```bash
# Set items cache to 1 minute
CACHE_TTL_ITEMS=60000 npm run dev
```

## Configuration Hierarchy

1. **Environment variables** (`.env`) - Override defaults
2. **Schema defaults** - Fallback values
3. **Derived config** - Computed values

Example:
```bash
# .env
PORT=4000              # Override default (3000)
LOG_LEVEL=debug        # Override default (info)
```

## Related Files

- [`../.env.example`](../../.env.example) - Environment template
- [`../tsconfig.json`](../../tsconfig.json) - TypeScript config
- [`../package.json`](../../package.json) - Dependencies

## Best Practices

### ✅ DO

- Validate all environment variables at startup
- Provide sensible defaults
- Fail fast on invalid configuration
- Use environment-specific settings (dev vs prod)

### ❌ DON'T

- Commit `.env` files to version control
- Use hardcoded values in code
- Assume an environment variable exists without validation
- Store secrets in environment variables

## Type Safety

All configuration is fully typed:
```typescript
export const appConfig: typeof config = {
  ...config,
  ...derivedConfig,
} as const;
```

This means autocomplete and type checking work throughout your code!

## Testing Configuration

### View Current Config

```typescript
import { appConfig } from './index.js';

console.log(appConfig.PORT);          // Type: number
console.log(appConfig.isProduction); // Type: boolean
```

### Override Config (Testing)

```typescript
// In tests
import { overrideConfig } from './test-utils';
overrideConfig({ PORT: 3001 });
```

---

**💡 Tip**: Always copy `.env.example` to `.env` before development!
