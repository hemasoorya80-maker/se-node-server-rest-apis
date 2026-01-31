# Lesson 1: Introduction to Production REST APIs

## Learning Objectives

By the end of this lesson, you will understand:
1. What makes an API "production-ready"
2. The core concepts we'll be implementing
3. How to navigate this learning repository
4. What you'll build by the end

## What is a Production-Ready API?

A production-ready API isn't just about returning data. It's about handling the **edge cases**, **errors**, **concurrency**, and **observability** that make real-world applications robust.

### The 5 Key Pillars

1. **Correctness** - Data validation and atomic operations
2. **Safety** - Security headers, rate limiting, input sanitization
3. **Observability** - Structured logs, request tracing, metrics
4. **Predictability** - Idempotency, consistent error responses
5. **Performance** - Caching, efficient database queries

## What You'll Build

We'll build a **Reservation System** for an inventory store. This domain is perfect for learning because it demonstrates:
- **Concurrency** - Preventing overselling when multiple users reserve the same item
- **Time-sensitive operations** - Reservations expire after 10 minutes
- **State transitions** - reserved → confirmed → cancelled/expired

## Repository Structure

```
docs/                    # Learning documentation (you are here)
├── 01-introduction.md  # This file
├── 02-validation.md    # Input validation with Zod
├── 03-concurrency.md   # Atomic database operations
├── 04-idempotency.md   # Handling duplicate requests
├── 05-caching.md       # Performance with caching
├── 06-logging.md       # Observability and tracing
└── README.md           # Documentation index

src/                     # Source code
├── config/             # Environment configuration
├── database/           # Database layer with SQLite
├── http/               # Response utilities
├── idempotency/        # Idempotency implementation
├── middleware/         # Express middleware
├── observability/      # Logging & metrics
├── routes/             # API endpoints
├── services/           # Business logic
├── types/              # TypeScript types
├── validation/         # Zod schemas
└── server.ts           # Application entry point
```

## How to Use This Repository

### Start Here
1. **Read the lessons** in `docs/` sequentially - each builds on the previous
2. **Explore the source code** - every file is heavily documented
3. **Run the API** - see it in action
4. **Make changes** - break things and fix them to learn

### Quick Start

```bash
# Install dependencies
npm install

# Set up the database
npm run db:migrate
npm run db:seed

# Start the server
npm run dev

# Test the API
curl http://localhost:3000/api/v1/items
```

## Learning Path

### Recommended Order

1. **Start Here** (this file) → Understand the what and why
2. [Validation](02-validation.md) → Learn to never trust client input
3. [Concurrency](03-concurrency.md) → Prevent race conditions
4. [Idempotency](04-idempotency.md) → Handle duplicate requests safely
5. [Caching](05-caching.md) → Improve performance
6. [Logging](06-logging.md) → Debug with structured logs

### Code-First Learning

If you prefer to explore the code first:
1. Start with [`src/server.ts`](../src/server.ts) - the entry point
2. Follow the middleware in order
3. Look at [`src/routes/index.ts`](../src/routes/index.ts) for API endpoints
4. Study [`src/services/reservations.ts`](../src/services/reservations.ts) for business logic

## Key Concepts Overview

### 1. Validation (Lesson 2)
**Problem**: Clients send bad data
**Solution**: Validate everything at the API boundary
**File**: [`src/validation/schemas.ts`](../src/validation/schemas.ts)

### 2. Concurrency (Lesson 3)
**Problem**: Two users reserve the last item simultaneously
**Solution**: Atomic database updates with transactions
**File**: [`src/services/reservations.ts`](../src/services/reservations.ts)

### 3. Idempotency (Lesson 4)
**Problem**: Network retries create duplicate reservations
**Solution**: Store responses by unique key, replay on duplicates
**File**: [`src/idempotency/index.ts`](../src/idempotency/index.ts)

### 4. Caching (Lesson 5)
**Problem**: Repeated database queries waste resources
**Solution**: Cache responses with TTL, invalidate on changes
**File**: [`src/cache/index.ts`](../src/cache/index.ts)

### 5. Logging (Lesson 6)
**Problem**: Debugging production issues is hard
**Solution**: Structured JSON logs with request IDs
**File**: [`src/observability/index.ts`](../src/observability/index.ts)

## Testing Your Knowledge

After completing all lessons, you should be able to:

- [ ] Explain why input validation is necessary
- [ ] Write atomic database operations
- [ ] Implement idempotency for POST requests
- [ ] Add caching with proper invalidation
- [ ] Add structured logging to an Express app
- [ ] Build a production-ready API from scratch

## Next Steps

Ready to dive in? Continue to [Lesson 2: Validation](02-validation.md)

---

**💡 Tip**: Each lesson has "What You'll Learn", "The Problem", "The Solution", and "Code Examples" sections. Read them in order for the best learning experience!
