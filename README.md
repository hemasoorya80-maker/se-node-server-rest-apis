# Production-Ready Node.js REST API

> A comprehensive, production-ready REST API demonstrating industry best practices for building scalable, maintainable server applications.

## 🎯 What This Project Teaches

This is a **learning repository** designed to teach you how to build production-ready REST APIs. Every concept is implemented with extensive documentation, code comments, and explanations.

### You Will Learn

1. ✅ **Input Validation** - How to validate and sanitize all client input
2. ✅ **Concurrency Control** - How to prevent race conditions and overselling
3. ✅ **Idempotency** - How to handle duplicate requests safely
4. ✅ **Caching** - How to improve performance with intelligent caching
5. ✅ **Structured Logging** - How to debug production issues with tracing
6. ✅ **Security** - How to protect against common vulnerabilities
7. ✅ **Error Handling** - How to return consistent, helpful error messages
8. ✅ **API Design** - How to design clean, intuitive REST APIs
9. ✅ **TypeScript** - How to write type-safe Node.js applications
10. ✅ **Testing** - How to validate your code works correctly

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Git** (for cloning)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/se-node-server-rest-apis.git
cd se-node-server-rest-apis

# Install dependencies
npm install

# Set up environment (optional - defaults work for development)
cp .env.example .env

# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed

# Start the development server
npm run dev
```

The API will be available at [http://localhost:3000](http://localhost:3000)

### Test It Out

```bash
# Check health
curl http://localhost:3000/health

# List items
curl http://localhost:3000/api/v1/items

# Reserve an item
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-key-123" \
  -d '{"userId":"user_test","itemId":"item_1","qty":1}'
```

## 📚 Learning Path

### Start Here: The Documentation

We've created comprehensive learning documentation in the [`docs/`](docs/) directory:

1. **[docs/01-introduction.md](docs/01-introduction.md)** - Overview and architecture
2. **[docs/02-validation.md](docs/02-validation.md)** - Input validation with Zod
3. **[docs/03-concurrency.md](docs/03-concurrency.md)** - Atomic database operations
4. **[docs/04-idempotency.md](docs/04-idempotency.md)** - Handling duplicate requests
5. **[docs/05-caching.md](docs/05-caching.md)** - Performance with caching
6. **[docs/06-logging.md](docs/06-logging.md)** - Observability and tracing

**💡 Start with [docs/README.md](docs/README.md) for the full learning guide.**

## 🛠️ The Stack

| Component | Technology | Why? |
|-----------|-----------|------|
| **Runtime** | Node.js 20+ | Latest LTS, ES2022 support |
| **Framework** | Express 4.x | Battle-tested, huge ecosystem |
| **Language** | TypeScript 5.x | Type safety, better DX |
| **Database** | SQLite (better-sqlite3) | Embedded, fast, zero-config |
| **Validation** | Zod | Runtime + compile-time validation |
| **Logging** | Pino | Ultra-fast structured logging |
| **Security** | Helmet, CORS | Security headers, cross-origin |

## 📁 Project Structure

```
se-node-server-rest-apis/
├── docs/                           # Learning documentation
│   ├── README.md                   # Documentation index
│   ├── 01-introduction.md          # Overview
│   ├── 02-validation.md            # Input validation
│   ├── 03-concurrency.md           # Race conditions
│   ├── 04-idempotency.md           # Duplicate requests
│   ├── 05-caching.md               # Performance
│   └── 06-logging.md               # Observability
│
├── src/                            # Source code
│   ├── cache/                      # Caching layer
│   │   └── index.ts                 # TTL cache with invalidation
│   ├── config/                     # Configuration
│   │   └── index.ts                 # Environment variables
│   ├── database/                   # Database layer
│   │   ├── index.ts                # SQLite connection
│   │   ├── migrate.ts              # Migration runner
│   │   └── seed.ts                 # Data seeding
│   ├── http/                       # Response utilities
│   │   └── index.ts                 # ok(), fail() helpers
│   ├── idempotency/                # Idempotency handling
│   │   └── index.ts                 # Duplicate request prevention
│   ├── middleware/                 # Express middleware
│   │   ├── rateLimit.ts             # Token bucket rate limiting
│   │   └── security.ts              # Security headers, CORS
│   ├── observability/              # Logging & metrics
│   │   └── index.ts                 # Pino structured logging
│   ├── routes/                     # API endpoints
│   │   ├── index.ts                 # Main routes
│   │   └── health.ts                # Health checks
│   ├── services/                   # Business logic
│   │   └── reservations.ts          # Domain logic
│   ├── types/                      # TypeScript types
│   │   └── index.ts                 # All type definitions
│   ├── validation/                 # Zod schemas
│   │   └── schemas.ts               # Request/response schemas
│   └── server.ts                   # Application entry point
│
├── tests/                          # Testing scripts
│   └── examples.sh                 # cURL examples
│
├── .env.example                    # Environment template
├── package.json                    # Dependencies
├── tsconfig.json                   # TypeScript config
└── README.md                       # This file
```

## 🎓 Core Concepts

### 1. Validation

**Problem**: Clients send invalid or malicious data.

**Solution**: Validate all input at the API boundary using Zod schemas.

```typescript
// src/validation/schemas.ts
export const reserveRequestSchema = z.object({
  userId: z.string().min(1),
  itemId: z.string().regex(/^item_\d+$/),
  qty: z.number().int().min(1).max(5)
});
```

**Learn more**: [docs/02-validation.md](docs/02-validation.md)

---

### 2. Concurrency Control

**Problem**: Two users reserve the last item simultaneously, both succeed (overselling).

**Solution**: Atomic database operations with conditional updates.

```sql
UPDATE items
SET availableQty = availableQty - ?
WHERE id = ? AND availableQty >= ?
```

**Learn more**: [docs/03-concurrency.md](docs/03-concurrency.md)

---

### 3. Idempotency

**Problem**: Network retries create duplicate reservations.

**Solution**: Store responses by unique key, replay on duplicates.

```typescript
// First request: Process and store
// Second request: Return cached response
```

**Learn more**: [docs/04-idempotency.md](docs/04-idempotency.md)

---

### 4. Caching

**Problem**: Repeated database queries waste resources.

**Solution**: Cache responses with TTL, invalidate on changes.

```typescript
const cached = getCache('items');
if (cached) return cached;

const items = fetchItems();
setCache('items', items, 30_000);
```

**Learn more**: [docs/05-caching.md](docs/05-caching.md)

---

### 5. Observability

**Problem**: Debugging production issues is hard without context.

**Solution**: Structured logs with request tracing.

```json
{
  "level": "info",
  "requestId": "abc-123",
  "msg": "Item reserved",
  "userId": "user_1",
  "itemId": "item_1"
}
```

**Learn more**: [docs/06-logging.md](docs/06-logging.md)

---

## 📖 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/items` | List all items |
| GET | `/items/:id` | Get single item |
| POST | `/reserve` | Reserve an item |
| POST | `/confirm` | Confirm reservation |
| POST | `/cancel` | Cancel reservation |
| GET | `/reservations/user/:userId` | List user's reservations |
| GET | `/health` | Health check |

### Response Format

All responses follow a consistent format:

**Success:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description",
    "details": { ... },
    "requestId": "uuid"
  }
}
```

## 🧪 Testing

### Manual Testing

```bash
# Run the test script
chmod +x tests/examples.sh
./tests/examples.sh

# Or test manually
curl http://localhost:3000/health
curl http://localhost:3000/api/v1/items
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":1}'
```

### Running Tests

```bash
# Run test suite (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript
npm run start        # Start production server
npm run lint         # Lint code
npm run format       # Format code
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database
npm run clean        # Clean build output
```

### Environment Variables

```bash
# .env file (copy from .env.example)
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
DB_PATH=./app.db
```

## 📦 Project Features

### ✅ Implemented

- [x] **Input Validation** with Zod schemas
- [x] **Atomic Operations** to prevent race conditions
- [x] **Idempotency** for safe request retries
- [x] **Response Caching** with automatic invalidation
- [x] **Rate Limiting** (token bucket algorithm)
- [x] **Structured Logging** with request tracing
- [x] **Security Headers** (Helmet.js)
- [x] **CORS Configuration**
- [x] **Health Check Endpoints**
- [x] **Graceful Shutdown**
- [x] **TypeScript** (100% typed)
- [x] **Database Migrations**
- [x] **Consistent Error Responses**

### 🎯 The Domain: Reservation System

We've built a **reservation system** for an inventory store because it demonstrates:

- **Time-sensitive operations** - Reservations expire after 10 minutes
- **State transitions** - reserved → confirmed → cancelled/expired
- **Concurrency** - Multiple users competing for limited inventory
- **Idempotency needs** - Network retries can cause double-charging

## 🏗️ Architecture

```
Request → Security Middleware → Rate Limiting → Validation → Route Handler
                                                    ↓
                                              Business Logic
                                                    ↓
                                              Database (SQLite)
                                                    ↓
                                              (Cache/Idempotency)
                                                    ↓
                                              Response
```

## 📚 Learning Resources

### In This Repository

- [`docs/README.md`](docs/README.md) - Complete learning guide
- Each source file has extensive comments
- Type definitions in [`src/types/index.ts`](src/types/index.ts) for reference

### External Resources

- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [Zod Documentation](https://zod.dev/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [REST API Tutorial](https://restfulapi.net/)

## 🤝 Contributing

This is a learning repository. Feel free to:

1. Explore the code
2. Make changes and break things
3. Fix issues and learn from them
4. Add new features

## 📄 License

MIT License - See LICENSE file for details

---

## 🎓 Start Learning Now!

Ready to dive in? Continue to the learning documentation:

**[← Start Learning with docs/01-introduction.md](docs/01-introduction.md)**

Or jump straight to a topic:

- [Validation →](docs/02-validation.md)
- [Concurrency →](docs/03-concurrency.md)
- [Idempotency →](docs/04-idempotency.md)
- [Caching →](docs/05-caching.md)
- [Logging →](docs/06-logging.md)

---

**💡 Tip**: Every file in this repository is heavily documented. Start exploring and happy learning!
