# Lesson 2: Input Validation with Zod

## Learning Objectives

By the end of this lesson, you will understand:
1. Why client input can never be trusted
2. How to validate request bodies with Zod
3. How to return consistent error responses
4. Best practices for validation schemas

## The Problem: Never Trust Client Input

Imagine a user sends this request:

```json
{
  "userId": "",
  "itemId": "not_an_item",
  "qty": -5
}
```

What happens when your code tries to:
- Reserve a negative quantity?
- Look up an item with an invalid ID?
- Process an empty user ID?

**Without validation**, your application might:
- Crash with unhelpful errors
- Create invalid data in the database
- Expose implementation details to attackers

## The Solution: Validate at API Boundaries

Use **Zod** to validate all input before it reaches your business logic.

### File: [`src/validation/schemas.ts`](../src/validation/schemas.ts)

```typescript
import { z } from 'zod';

export const reserveRequestSchema = z.object({
  userId: z.string().min(1),                                    // Required, non-empty
  itemId: z.string().regex(/^item_\d+$/),                     // Must match format
  qty: z.number().int().min(1).max(5)                         // 1-5, integer
});
```

### How It Works

1. **Define schema** - Declare what valid input looks like
2. **Parse request** - Check if request body matches schema
3. **Return error** - Send validation error if invalid
4. **Use data** - TypeScript knows data is valid

### File: [`src/routes/index.ts`](../src/routes/index.ts)

```typescript
const parsed = validateRequest(reserveRequestSchema, req.body);
if (!parsed.ok) {
  return badRequest(res, 'VALIDATION_ERROR', 'Invalid request', {
    issues: parsed.error.details
  });
}

// TypeScript now knows these are valid strings/numbers
const { userId, itemId, qty } = parsed.data;
```

## Why Zod?

### Type Inference
```typescript
const schema = z.object({
  qty: z.number()
});

type Input = z.infer<typeof schema>;
// { qty: number }
```

### Runtime Validation
```typescript
const result = schema.safeParse({ qty: "5" });

if (!result.success) {
  // Handle error
  console.log(result.error); // ZodError with details
}

// result.data is now { qty: 5 } (coerced to number)
```

### Composable Schemas
```typescript
const nonEmptyString = z.string().min(1);
const itemId = nonEmptyString.regex(/^item_\d+$/);
const itemName = nonEmptyString.max(100);
```

## Common Validation Patterns

### 1. Required Fields
```typescript
z.string().min(1)           // Non-empty string
z.number().positive()        // Must be > 0
```

### 2. Optional Fields
```typescript
z.string().optional()        // Can be undefined
z.string().nullable()        // Can be null
z.string().nullish()         // Can be null or undefined
```

### 3. Format Validation
```typescript
z.string().email()           // Email address
z.string().url()             // URL
z.string().regex(/^[A-Z]{2}$/)  // Custom regex
```

### 4. Range Validation
```typescript
z.number().min(1).max(100)   // 1-100
z.array().min(1).max(10)     // 1-10 items
z.enum(['reserved', 'confirmed'])  // Must be one of these
```

## Best Practices

### ✅ DO: Validate at Entry Point
```typescript
app.post('/reserve', (req, res) => {
  const parsed = validateRequest(reserveRequestSchema, req.body);
  if (!parsed.ok) return sendError(parsed.error);

  // Business logic only sees valid data
  reserveItem(parsed.data);
});
```

### ❌ DON'T: Validate in Business Logic
```typescript
// Don't do this!
function reserveItem(data: any) {
  if (!data.userId || typeof data.userId !== 'string') {
    throw new Error('Invalid userId');
  }
  // Business logic shouldn't handle validation
}
```

### ✅ DO: Use Descriptive Error Messages
```typescript
z.number()
  .min(1, 'Minimum quantity is 1')
  .max(5, 'Maximum quantity is 5')
```

### ❌ DON'T: Expose Implementation Details
```typescript
// Bad: Shows database schema
"Column user_id cannot be null"

// Good: User-friendly message
"User ID is required"
```

## Testing Validation

Try these requests to see validation in action:

### Valid Request
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":2}'
```

### Invalid: Empty User ID
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"","itemId":"item_1","qty":2}'
# Response: 400 {"ok":false,"error":{"code":"VALIDATION_ERROR",...}}
```

### Invalid: Quantity Too High
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"item_1","qty":10}'
# Response: 400 {"ok":false,"error":{"code":"VALIDATION_ERROR","..."}}
```

### Invalid: Wrong Item Format
```bash
curl -X POST http://localhost:3000/api/v1/reserve \
  -H "Content-Type: application/json" \
  -d '{"userId":"user_1","itemId":"invalid","qty":1}'
# Response: 400 {"ok":false,"error":{"code":"VALIDATION_ERROR",...}}
```

## In This Repository

| File | Purpose |
|------|---------|
| [`src/validation/schemas.ts`](../src/validation/schemas.ts) | All validation schemas |
| [`src/types/index.ts`](../src/types/index.ts) | Result types for validation |
| [`src/http/index.ts`](../src/http/index.ts) | `badRequest()` helper |
| [`src/routes/index.ts`](../src/routes/index.ts) | Schema usage in endpoints |

## Exercise: Add a New Validation Rule

**Task**: Add an email field to the user schema.

1. Open [`src/validation/schemas.ts`](../src/validation/schemas.ts)
2. Create a user schema with email validation:
   ```typescript
   export const userSchema = z.object({
     userId: z.string().min(1),
     email: z.string().email()
   });
   ```
3. Test with valid and invalid emails

## Key Takeaways

1. **Validate early** - At the API boundary, before business logic
2. **Use schemas** - Declarative validation is easier to maintain
3. **Return consistent errors** - Same format everywhere
4. **Be specific** - Clear error messages help developers

## Next Lesson

Continue to [Lesson 3: Concurrency & Atomic Operations](03-concurrency.md) to learn how to prevent race conditions when multiple users interact with your API simultaneously.

---

**💡 Tip**: Run `npm run dev` and use the examples above to see validation errors in action!
