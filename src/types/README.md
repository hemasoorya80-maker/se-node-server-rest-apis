# Types Module

## What This Module Teaches

This module demonstrates **TypeScript type definitions**, **discriminated unions**, **API response types**, and **type-safe validation results** for a production REST API.

## Key Concepts

### 1. Discriminated Unions

A discriminated union uses a common property (the "discriminant") to narrow types:

```typescript
type Result =
  | { kind: 'OK'; data: UserData }
  | { kind: 'ERROR'; message: string };

function handleResult(result: Result) {
  // TypeScript knows `data` only exists if `kind === 'OK'`
  if (result.kind === 'OK') {
    console.log(result.data.name);  // ✅ Type-safe
  } else {
    console.log(result.message);    // ✅ Type-safe
  }
}
```

### 2. Type Guards

Narrow types using conditional checks:

```typescript
function isOK(result: Result): result is { kind: 'OK'; data: UserData } {
  return result.kind === 'OK';
}

if (isOK(result)) {
  console.log(result.data);  // TypeScript knows this is safe
}
```

### 3. Strict Types

Prevent runtime errors with compile-time checks:

```typescript
// ❌ BAD - `any` loses type safety
function process(data: any) {
  return data.toUpperCase();  // Could fail at runtime
}

// ✅ GOOD - Type-safe
function process(data: string): string {
  return data.toUpperCase();  // Compiler verifies it's a string
}
```

## Files in This Directory

### [`index.ts`](index.ts)

Complete type definitions for:
- **API responses** - Success/error response formats
- **Domain models** - Item, Reservation, User
- **Result types** - Discriminated unions for operations
- **Validation** - Validation result types
- **HTTP** - Status codes, error codes
- **Logging** - Log entries and metrics

## Core Types

### API Response

Success response format:

```typescript
interface SuccessResponse<T> {
  ok: true;
  data: T;
  meta?: ResponseMeta;
}

interface ResponseMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  sortBy?: string;
  sortOrder?: string;
}
```

Error response format:

```typescript
interface ErrorResponse {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
    requestId?: string;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

### Domain Models

Item:

```typescript
interface Item {
  id: string;
  name: string;
  availableQty: number;
  createdAt?: number;
  updatedAt?: number;
}
```

Reservation:

```typescript
type ReservationStatus = 'reserved' | 'confirmed' | 'cancelled' | 'expired';

interface Reservation {
  id: string;
  userId: string;
  itemId: string;
  qty: number;
  status: ReservationStatus;
  expiresAt: number;
  createdAt: number;
  updatedAt?: number;
}
```

## Result Types (Discriminated Unions)

### Reserve Result

```typescript
type ReserveResult =
  | { kind: 'OK'; reservation: Reservation }
  | { kind: 'NOT_FOUND' }
  | { kind: 'OUT_OF_STOCK'; available: number }
  | { kind: 'INVALID_QUANTITY'; min: number; max: number };
```

Usage:

```typescript
const result = reserveItem({ userId, itemId, qty });

if (result.kind === 'OK') {
  console.log(result.reservation.id);
} else if (result.kind === 'OUT_OF_STOCK') {
  console.log(`Only ${result.available} available`);
} else if (result.kind === 'INVALID_QUANTITY') {
  console.log(`Quantity must be between ${result.min} and ${result.max}`);
}
```

### Confirm Result

```typescript
type ConfirmResult =
  | { kind: 'OK' }
  | { kind: 'NOT_FOUND' }
  | { kind: 'ALREADY_CONFIRMED' }
  | { kind: 'CANCELLED' }
  | { kind: 'EXPIRED' };
```

### Cancel Result

```typescript
type CancelResult =
  | { kind: 'OK' }
  | { kind: 'NOT_FOUND' }
  | { kind: 'ALREADY_CANCELLED' }
  | { kind: 'ALREADY_CONFIRMED' };
```

### Expire Result

```typescript
type ExpireResult =
  | { kind: 'OK'; expired: number }
  | { kind: 'ERROR'; message: string };
```

## Validation Types

### Validation Result

```typescript
interface ValidationError {
  field: string;
  message: string;
}

interface ValidationResultSuccess<T> {
  success: true;
  data: T;
}

interface ValidationResultFailure {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details: ValidationError[];
  };
}

type ValidationResult<T> =
  | ValidationResultSuccess<T>
  | ValidationResultFailure;
```

Usage:

```typescript
const result = validateRequest(schema, requestBody);

if (result.success) {
  console.log(result.data.userId);  // ✅ Type-safe
} else {
  console.log(result.error.details);  // ✅ Type-safe
}
```

## HTTP Types

### Error Codes

```typescript
type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'UNPROCESSABLE_ENTITY'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'OUT_OF_STOCK'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'INVALID_IDEMPOTENCY_KEY'
  | 'IDEMPOTENCY_KEY_REQUIRED';
```

### HTTP Status

```typescript
type HttpStatus =
  | 200 | 201 | 204           // Success
  | 301 | 302 | 304           // Redirect
  | 400 | 401 | 403 | 404     // Client error
  | 409 | 422 | 429
  | 500 | 503;                // Server error
```

## Logging Types

### Log Entry

```typescript
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}
```

### HTTP Log Entry

```typescript
interface HttpLogEntry extends LogEntry {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}
```

## Database Row Types

Types matching database schema:

```typescript
interface ItemRow {
  id: string;
  name: string;
  availableQty: number;
  createdAt: number;
  updatedAt: number;
}

interface ReservationRow {
  id: string;
  userId: string;
  itemId: string;
  qty: number;
  status: ReservationStatus;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

interface IdempotencyKeyRow {
  key: string;
  route: string;
  userId: string;
  responseJson: string;
  createdAt: number;
}
```

## Request Types

### Reserve Request

```typescript
interface ReserveRequest {
  userId: string;
  itemId: string;
  qty: number;
}
```

### Confirm Request

```typescript
interface ConfirmRequest {
  userId: string;
  reservationId: string;
}
```

### Cancel Request

```typescript
interface CancelRequest {
  userId: string;
  reservationId: string;
}
```

## Utility Types

### Partial by Key

```typescript
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Make certain fields optional
interface User {
  id: string;
  name: string;
  email: string;
  age: number;
}

type CreateUserInput = PartialBy<User, 'id' | 'age'>;
// { id?: string; name: string; email: string; age?: number }
```

### Required Keys

```typescript
type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Make certain fields required
interface UpdateUserInput {
  name?: string;
  email?: string;
  age?: number;
}

type ValidatedInput = RequiredKeys<UpdateUserInput, 'email'>;
// { name?: string; email: string; age?: number }
```

## Type Guards

### Is Success

```typescript
function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.ok === true;
}

if (isSuccess(response)) {
  console.log(response.data);  // ✅ Type-safe
}
```

### Is Error

```typescript
function isError(response: ApiResponse<unknown>): response is ErrorResponse {
  return response.ok === false;
}

if (isError(response)) {
  console.log(response.error.message);  // ✅ Type-safe
}
```

### Check Result Kind

```typescript
function isOK(result: ReserveResult): result is { kind: 'OK'; reservation: Reservation } {
  return result.kind === 'OK';
}

if (isOK(result)) {
  console.log(result.reservation.id);  // ✅ Type-safe
}
```

## Related Files

- [`../validation/schemas.ts`](../validation/schemas.ts) - Zod schemas
- [`../http/index.ts`](../http/index.ts) - Response helpers
- [`../services/reservations.ts`](../services/reservations.ts) - Result type usage

## Best Practices

### ✅ DO

- Use discriminated unions for results
- Provide specific error types
- Use `readonly` for immutable data
- Use `as const` for literal types
- Create type guards for complex checks
- Export types for reuse

### ❌ DON'T

- Use `any` (use `unknown` instead)
- Use loose types (`object`, `Function`)
- Forget to mark optional fields with `?`
- Use magic strings (use type aliases)
- Ignore TypeScript errors

## Examples

### Creating Type-Safe API Client

```typescript
async function reserveItem(
  request: ReserveRequest
): Promise<ReserveResult> {
  const response = await fetch('/api/v1/reserve', {
    method: 'POST',
    body: JSON.stringify(request)
  });

  const data = await response.json() as ApiResponse<Reservation>;

  if (!data.ok) {
    // Handle error
    return { kind: 'OUT_OF_STOCK', available: 0 };
  }

  return { kind: 'OK', reservation: data.data };
}
```

### Type-Safe Validation

```typescript
function validateReservation(data: unknown): data is Reservation {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'userId' in data &&
    'status' in data
  );
}

if (validateReservation(input)) {
  console.log(input.status);  // ✅ Type-safe
}
```

---

**💡 Tip**: Use discriminated unions everywhere! They make your code type-safe and self-documenting.
