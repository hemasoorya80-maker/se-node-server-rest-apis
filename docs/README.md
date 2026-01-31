# Learning Documentation Index

Complete guide to building production-ready REST APIs with Node.js and Express.

## 📚 Lessons

| Lesson | Topic | Description |
|--------|-------|-------------|
| [01 - Introduction](01-introduction.md) | Getting Started | Overview of production APIs and repository structure |
| [02 - Validation](02-validation.md) | Input Validation | Validate client input with Zod schemas |
| [03 - Concurrency](03-concurrency.md) | Race Conditions | Atomic database operations to prevent overselling |
| [04 - Idempotency](04-idempotency.md) | Duplicate Requests | Handle retries safely with idempotency keys |
| [05 - Caching](05-caching.md) | Performance | Improve response times with intelligent caching |
| [06 - Logging](06-logging.md) | Observability | Debug production with structured logging |
| [07 - Validation Guide](07-validation-guide.md) | Testing | Complete testing guide with curl examples |

## 🎯 Learning Path

### Recommended Order

1. Start with [Introduction](01-introduction.md) to understand what we're building
2. Continue through lessons 2-6 sequentially
3. Each lesson builds on the previous
4. Complete the exercises at the end of each lesson

### Code-First Path

If you prefer exploring code first:
1. [`src/server.ts`](../src/server.ts) - Application entry point
2. [`src/routes/index.ts`](../src/routes/index.ts) - API endpoints
3. [`src/services/reservations.ts`](../src/services/reservations.ts) - Business logic
4. Return to lessons to understand the "why"

## 📁 Source Code Guide

### Core Modules

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| `config/` | Configuration | [`index.ts`](../src/config/index.ts) - Environment variables |
| `database/` | Data layer | [`index.ts`](../src/database/index.ts) - SQLite connection |
| `http/` | Response helpers | [`index.ts`](../src/http/index.ts) - `ok()`, `fail()` functions |
| `routes/` | API endpoints | [`index.ts`](../src/routes/index.ts) - All routes |
| `services/` | Business logic | [`reservations.ts`](../src/services/reservations.ts) - Domain logic |
| `middleware/` | Express middleware | [`rateLimit.ts`](../src/middleware/rateLimit.ts), [`security.ts`](../src/middleware/security.ts) |
| `cache/` | Caching layer | [`index.ts`](../src/cache/index.ts) - In-memory cache |
| `idempotency/` | Duplicate handling | [`index.ts`](../src/idempotency/index.ts) - Idempotency keys |
| `observability/` | Logging & metrics | [`index.ts`](../src/observability/index.ts) - Structured logging |
| `validation/` | Schemas | [`schemas.ts`](../src/validation/schemas.ts) - Zod schemas |
| `types/` | TypeScript types | [`index.ts`](../src/types/index.ts) - Type definitions |

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up database
npm run db:migrate
npm run db:seed

# Start server
npm run dev

# Test API
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/items
```

## 🧪 Testing the API

### Three Ways to Test:

**1. Postman (Recommended)**
- Import [`postman-collection.json`](../postman-collection.json)
- Import [`postman-environment.json`](../postman-environment.json)
- 📖 Full guide: [POSTMAN_GUIDE.md](../POSTMAN_GUIDE.md)

**2. Learning Checklist**
- Track your progress
- Validate each feature
- 📋 Checklist: [LEARNING_CHECKLIST.md](../LEARNING_CHECKLIST.md)

**3. cURL Examples**
- Terminal-based testing
- 📖 Examples: [07-validation-guide.md](07-validation-guide.md)

## 📖 API Endpoints

### Items
- `GET /api/v1/items` - List all items
- `GET /api/v1/items/:id` - Get single item

### Reservations
- `POST /api/v1/reserve` - Reserve an item
- `POST /api/v1/confirm` - Confirm a reservation
- `POST /api/v1/cancel` - Cancel a reservation
- `GET /api/v1/reservations/user/:userId` - List user's reservations

### Health
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check with dependency status

## 🎓 Common Tasks

### Add a New Endpoint

1. Create schema in [`src/validation/schemas.ts`](../src/validation/schemas.ts)
2. Add route in [`src/routes/index.ts`](../src/routes/index.ts)
3. Implement business logic in [`src/services/`](../src/services/)

### Add Caching

```typescript
// In your route handler
const cached = getCache('my-key');
if (cached) return ok(res, cached);

const data = fetchData();
setCache('my-key', data, 30_000);
return ok(res, data);
```

### Add Logging

```typescript
import { logger } from '../observability/index.js';

logger.info('Event happened', {
  userId,
  action: 'reserved',
  itemId
});
```

## 🔍 Troubleshooting

### Build Errors

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### Database Errors

```bash
# Reset database
rm -f app.db app.db-*
npm run db:migrate
npm run db:seed
```

### Server Won't Start

```bash
# Check if port 3000 is in use
lsof -i :3000
# Kill the process
kill -9 <PID>
```

## 📚 Additional Resources

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Documentation](https://zod.dev/)
- [Pino Logging](https://getpino.io/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

---

**Ready to learn? Start with [Lesson 1: Introduction](01-introduction.md)**
