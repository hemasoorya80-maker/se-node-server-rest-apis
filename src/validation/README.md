# Validation Module

## What This Module Teaches

This module demonstrates **input validation** using Zod schemas. Never trust client input - always validate on the server!

## Key Concepts

### 1. Why Validate Input?

Client input can be:
- **Malicious** - SQL injection, XSS attacks
- **Invalid** - Missing fields, wrong types
- **Malformed** - Bad formats, out of range

### 2. Zod Schemas

Zod provides **type-safe validation**:

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  name: z.string().min(2).max(100)
});

// Validate
const result = schema.safeParse(input);

if (result.success) {
  console.log(result.data.email);  // ✅ Type-safe!
}
```

### 3. Validation Flow

```
Client Request → Validate → Success? → Process Data
                      ↓
                    Failure → Return Error
```

## Files in This Directory

### [`schemas.ts`](schemas.ts)

Zod validation schemas for:
- **Request bodies** - POST/PUT/PATCH data
- **Query parameters** - GET query strings
- **Path parameters** - URL params like `:id`
- **Validation helpers** - Reusable validation functions

## Common Validation Patterns

### String Validation

```typescript
// Required string
z.string()

// Min/max length
z.string().min(2).max(100)

// Email format
z.string().email()

// URL format
z.string().url()

// UUID format
z.string().uuid()

// Regex pattern
z.string().regex(/^[a-z]+_\d+$/)

// Specific values (enum)
z.enum(['reserved', 'confirmed', 'cancelled', 'expired'])

// Transform (convert after validation)
z.string().transform(val => val.trim().toLowerCase())

// Default value
z.string().default('anonymous')
```

### Number Validation

```typescript
// Required number
z.number()

// Min/max values
z.number().min(1).max(100)

// Positive/negative
z.number().positive()
z.number().negative()

// Integers
z.number().int()

// Specific values
z.number().refine(val => val === 1 || val === 2 || val === 3)

// Transform
z.string().transform(val => parseInt(val, 10))

// Coerce (auto-convert)
z.coerce.number()
```

### Boolean Validation

```typescript
// Boolean
z.boolean()

// Coerce string to boolean
z.coerce.boolean()

// Transform
z.string().transform(val => val === 'true')
```

### Date Validation

```typescript
// Date string
z.string().datetime()

// Unix timestamp (number)
z.number().int().positive()

// Transform to Date
z.number().transform(val => new Date(val))

// Min/max date
z.date().min(new Date('2024-01-01'))
z.date().max(new Date('2025-12-31'))
```

### Object Validation

```typescript
// Object with required fields
z.object({
  name: z.string(),
  age: z.number()
})

// Object with optional fields
z.object({
  name: z.string(),
  age: z.number().optional()
})

// Object with default values
z.object({
  name: z.string(),
  age: z.number().default(18)
})

// Partial object (all fields optional)
z.object({
  name: z.string(),
  age: z.number()
}).partial()

// Extend object
const baseSchema = z.object({ id: z.string() });
const extendedSchema = baseSchema.extend({
  name: z.string()
});
```

### Array Validation

```typescript
// Array
z.array(z.string())

// Min/max length
z.array(z.string()).min(1).max(10)

// Non-empty
z.array(z.string()).nonempty()

// Set (unique values)
z.array(z.string()).refine(
  (vals) => new Set(vals).size === vals.length,
  { message: "Values must be unique" }
)
```

### Advanced Validation

```typescript
// Custom validation
z.string().refine(
  (val) => val.startsWith('item_'),
  { message: "Must start with 'item_'" }
)

// Conditional validation
z.object({
  type: z.enum(['user', 'admin']),
  permissions: z.array(z.string()).optional()
}).refine(
  (data) => data.type !== 'admin' || data.permissions,
  { message: "Admins must have permissions" }
)

// Transform with validation
z.string()
  .transform(val => val.toUpperCase())
  .refine(val => val.length > 0)

// Union (one of)
z.union([z.string(), z.number()])

// Discriminated union
z.discriminatedUnion('type', [
  z.object({ type: z.literal('user'), name: z.string() }),
  z.object({ type: z.literal('admin'), name: z.string(), permissions: z.array(z.string()) })
])
```

## Validation Helpers

### Validate Request Body

```typescript
import { validateRequest } from './schemas.js';

const result = validateRequest(reserveRequestSchema, req.body);

if (!result.success) {
  return badRequest(res, req, result.error.code, result.error.message, {
    issues: result.error.details
  });
}

const { userId, itemId, qty } = result.data;  // ✅ Type-safe
```

### Validate Query Parameters

```typescript
const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

const result = validateRequest(querySchema, req.query);

const { page, pageSize, sortBy, sortOrder } = result.data;
```

### Validate Path Parameters

```typescript
const paramsSchema = z.object({
  id: z.string().regex(/^[a-z]+_\d+$/, 'Invalid ID format')
});

const result = validateRequest(paramsSchema, req.params);
```

## Schemas in This Project

### Reserve Request Schema

```typescript
const reserveRequestSchema = z.object({
  userId: z.string()
    .min(1, 'User ID is required')
    .regex(/^user_\w+$/, 'Invalid user ID format'),
  itemId: z.string()
    .min(1, 'Item ID is required')
    .regex(/^item_\w+$/, 'Invalid item ID format'),
  qty: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100')
});
```

**Valid input**:
```json
{
  "userId": "user_123",
  "itemId": "item_abc",
  "qty": 5
}
```

**Invalid input** (returns errors):
```json
{
  "userId": "",
  "itemId": "invalid-format",
  "qty": 0
}
```

### Confirm Request Schema

```typescript
const confirmRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reservationId: z.string()
    .min(1, 'Reservation ID is required')
    .regex(/^res_\w+$/, 'Invalid reservation ID format')
});
```

### Cancel Request Schema

```typescript
const cancelRequestSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  reservationId: z.string().min(1, 'Reservation ID is required')
});
```

### Get Items Query Schema

```typescript
const getItemsQuerySchema = z.object({
  sortBy: z.enum(['name', 'availableQty']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});
```

## Error Format

Validation errors return consistent format:

```typescript
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      { "field": "qty", "message": "Quantity must be at least 1" },
      { "field": "itemId", "message": "Invalid item ID format" }
    ]
  }
}
```

## Custom Error Messages

```typescript
// Default message
z.string().min(2)  // "String must contain at least 2 character(s)"

// Custom message
z.string().min(2, 'Name is too short (min 2 characters)')

// Custom messages for each check
z.number({
  required_error: "Age is required",
  invalid_type_error: "Age must be a number"
}).min(18, "Must be at least 18 years old")
```

## Type Inference

### Infer TypeScript Type from Schema

```typescript
const reserveSchema = z.object({
  userId: z.string(),
  itemId: z.string(),
  qty: z.number()
});

// Infer type
type ReserveRequest = z.infer<typeof reserveSchema>;
// { userId: string; itemId: string; qty: number }

// Use in functions
function handleReserve(data: ReserveRequest) {
  console.log(data.userId);  // ✅ Type-safe
}
```

### Infer Input/Output Types

```typescript
const schema = z.string().transform(val => val.toUpperCase());

type Input = z.input<typeof schema>;   // string
type Output = z.output<typeof schema>;  // string (transformed)
```

## Testing Validation

### Test Valid Input

```typescript
const result = reserveRequestSchema.safeParse({
  userId: 'user_123',
  itemId: 'item_1',
  qty: 5
});

expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.qty).toBe(5);
}
```

### Test Invalid Input

```typescript
const result = reserveRequestSchema.safeParse({
  userId: '',
  itemId: 'invalid',
  qty: 0
});

expect(result.success).toBe(false);
if (!result.success) {
  expect(result.error.details).toHaveLength(3);
}
```

## Related Files

- [`../types/index.ts`](../types/index.ts) - Validation result types
- [`../routes/index.ts`](../routes/index.ts) - Schema usage in routes
- [`../docs/02-validation.md`](../../docs/02-validation.md) - Full lesson on validation

## Best Practices

### ✅ DO

- Validate all input on the server
- Use specific error messages
- Provide default values where appropriate
- Use regex for format validation
- Transform data (trim, lowercase)
- Coerce types (string → number)
- Infer types from schemas

### ❌ DON'T

- Trust client validation
- Use generic error messages
- Forget to validate nested objects
- Allow invalid formats
- Skip validation for "internal" APIs
- Use `any` to bypass validation

## Examples

### Email Validation

```typescript
const emailSchema = z.string().email('Invalid email format');

emailSchema.safeParse('user@example.com');  // ✅ Success
emailSchema.safeParse('invalid');            // ❌ Error
```

### Password Validation

```typescript
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number');

passwordSchema.safeParse('Pass123');  // ✅ Success
passwordSchema.safeParse('weak');     // ❌ Error
```

### URL Slug Validation

```typescript
const slugSchema = z.string()
  .regex(/^[a-z0-9-]+$/, 'Must contain only lowercase letters, numbers, and hyphens')
  .transform(val => val.toLowerCase());

slugSchema.safeParse('My-Post-Title');  // ✅ Success (transformed to 'my-post-title')
slugSchema.safeParse('Invalid!');       // ❌ Error
```

---

**💡 Tip**: Use Zod's `safeParse()` instead of `parse()` in route handlers - it returns a result object instead of throwing!
