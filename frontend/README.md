# Reservation System Frontend

A modern, production-ready Next.js 16 frontend for the Reservation System API. Built with the latest React patterns, TypeScript, Tailwind CSS, and shadcn/ui.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)

---

## Table of Contents

- [What This Project Teaches](#what-this-project-teaches)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Architecture](#project-architecture)
- [Learning Concepts](#learning-concepts)
  - [Server State Management](#1-server-state-management-with-tanstack-query)
  - [Forms & Validation](#2-forms--validation-with-react-hook-form--zod)
  - [API Integration](#3-api-integration-patterns)
  - [Error Handling](#4-error-handling-strategies)
  - [Component Architecture](#5-component-architecture)
  - [Modern CSS](#6-modern-css-with-tailwind-v4)
- [Application Routes](#application-routes)
- [Component Library](#component-library)
- [Testing](#testing)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)

---

## What This Project Teaches

This is a **learning repository** for modern React frontend development. Every concept is implemented with extensive documentation, inline code comments, and real-world patterns.

### You Will Learn

1. ✅ **Server State Management** - How to use TanStack Query for data fetching, caching, and synchronization
2. ✅ **Form Handling** - How to build type-safe forms with React Hook Form and Zod validation
3. ✅ **API Integration** - How to create a type-safe API client with error normalization
4. ✅ **Optimistic Updates** - How to make the UI feel instant while waiting for the server
5. ✅ **Cache Invalidation** - How to keep data consistent across the application
6. ✅ **Error Boundaries** - How to gracefully handle and display errors
7. ✅ **Component Composition** - How to build reusable, composable UI components
8. ✅ **Modern CSS** - How to use Tailwind CSS v4 with custom utilities
9. ✅ **Glass-morphism Design** - How to create modern glass-like UI effects
10. ✅ **Testing with MSW** - How to mock API calls for reliable tests

---

## Prerequisites

Before running this application, ensure you have:

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Backend API** running on port 3000 (see main project README)

---

## Getting Started

### 1. Start the Backend (Port 3000)

From the project root (parent directory):

```bash
# Install backend dependencies (if not already done)
npm install

# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed

# Start the development server
npm run dev
```

The backend will be available at `http://localhost:3000`.

### 2. Start the Frontend (Port 3001)

From this directory (`frontend/`):

```bash
# Install frontend dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:3001`.

---

## Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the backend API | Yes |

**Note:** The `NEXT_PUBLIC_` prefix is required for the variable to be accessible in client-side code.

---

## Available Scripts

| Script | Description | Port |
|--------|-------------|------|
| `npm run dev` | Start development server with hot reload | 3001 |
| `npm run build` | Create production build | - |
| `npm run start` | Start production server | 3001 |
| `npm run lint` | Run ESLint | - |
| `npm test` | Run Vitest tests | - |
| `npm run test:ui` | Run tests with UI | - |

---

## Project Architecture

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── items/
│   │   │   ├── page.tsx        # Items list page
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Item detail page
│   │   ├── users/
│   │   │   └── [userId]/
│   │   │       └── reservations/
│   │   │           └── page.tsx # User reservations page
│   │   ├── layout.tsx          # Root layout with providers
│   │   ├── page.tsx            # Home/dashboard page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── layout/             # Layout components
│   │   │   └── shell.tsx       # App shell with navigation
│   │   ├── ui/                 # shadcn/ui components
│   │   │   ├── alert.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── sonner.tsx
│   │   │   └── table.tsx
│   │   └── ui-blocks/          # Custom UI blocks
│   │       ├── empty-state.tsx
│   │       ├── error-alert.tsx
│   │       ├── loading-skeleton.tsx
│   │       └── status-badge.tsx
│   ├── lib/
│   │   ├── api/                # API layer
│   │   │   ├── client.ts       # HTTP client
│   │   │   ├── endpoints.ts    # API endpoint functions
│   │   │   ├── types.ts        # TypeScript types
│   │   │   └── index.ts        # Public exports
│   │   ├── query/              # TanStack Query setup
│   │   │   ├── keys.ts         # Query key definitions
│   │   │   ├── provider.tsx    # QueryClient provider
│   │   │   └── index.ts
│   │   └── utils.ts            # Utility functions
│   ├── test/                   # Test infrastructure
│   │   ├── mocks/              # MSW mocks
│   │   │   ├── data.ts         # Mock data factories
│   │   │   ├── handlers.ts     # MSW request handlers
│   │   │   ├── server.ts       # MSW server setup
│   │   │   └── index.ts        # Public exports
│   │   └── setup.ts            # Test setup
│   └── ...
├── public/                     # Static assets
├── .env.local                  # Environment variables
├── next.config.ts              # Next.js configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts            # Vitest configuration
```

---

## Learning Concepts

### 1. Server State Management with TanStack Query

**What is Server State?**
Server state is data that lives on the server and is fetched by the client. Unlike client state (like UI toggles), server state:
- Can be changed by other users
- Needs to be cached for performance
- Can become stale and needs refreshing
- Requires loading and error states

**Why TanStack Query?**
Traditional approaches (useEffect + fetch) require you to manually handle:
- Loading states
- Error handling
- Caching
- Refetching
- Race conditions

TanStack Query handles all of this automatically.

**Key Concepts Demonstrated:**

```typescript
// useQuery - For reading data
const { data, isLoading, error } = useQuery({
  queryKey: ['item', id],
  queryFn: () => getItem(id),
});

// useMutation - For writing data
const mutation = useMutation({
  mutationFn: reserveItem,
  onSuccess: () => {
    // Invalidate related queries to refresh data
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});
```

**Query Keys - The Secret to Cache Management:**

Query keys are like addresses for your cached data. TanStack Query uses them to:
- Identify cached data
- Determine when to refetch
- Share data between components

```typescript
// Centralized query keys (src/lib/query/keys.ts)
export const queryKeys = {
  items: () => ['items'] as const,
  item: (id: string) => ['item', id] as const,
  reservations: (userId: string) => ['reservations', userId] as const,
};

// Usage - automatically tied to cache
useQuery({ queryKey: queryKeys.item('item_1'), ... });

// Invalidation - mark as stale to trigger refetch
queryClient.invalidateQueries({ queryKey: queryKeys.items() });
```

**Cache Invalidation Strategy:**

After mutations, we invalidate queries to keep data fresh:

```typescript
// After reserving an item:
onSuccess: () => {
  // Invalidate items list (stock changed)
  queryClient.invalidateQueries({ queryKey: queryKeys.items() });
  // Invalidate user's reservations
  queryClient.invalidateQueries({ 
    queryKey: queryKeys.reservations(userId) 
  });
}
```

---

### 2. Forms & Validation with React Hook Form + Zod

**Why React Hook Form?**
- Minimal re-renders (performance)
- Built-in validation support
- Easy error handling
- TypeScript support

**Why Zod?**
- Runtime type validation
- TypeScript inference
- Declarative schemas
- Great error messages

**The Pattern:**

```typescript
// 1. Define schema
const reserveSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  qty: z.coerce.number().int().min(1).max(5),
});

// 2. Infer TypeScript type from schema
type ReserveFormData = z.infer<typeof reserveSchema>;

// 3. Use in component
const form = useForm<ReserveFormData>({
  resolver: zodResolver(reserveSchema),
  defaultValues: { userId: '', qty: 1 },
});

// 4. Handle submission
const onSubmit = (data: ReserveFormData) => {
  mutation.mutate(data);
};
```

**Key Features:**
- Real-time validation as user types
- Disabled submit while pending
- Clear error messages
- Type-safe data throughout

---

### 3. API Integration Patterns

**HTTP Client Abstraction:**

We use a centralized HTTP client that handles:
- Request/response formatting
- Error normalization
- Idempotency key generation
- Header management

```typescript
// src/lib/api/client.ts
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  // 1. Build URL
  // 2. Add headers (including Idempotency-Key if needed)
  // 3. Handle {ok: true, data: ...} response format
  // 4. Normalize errors to ApiError type
  // 5. Return typed data
}
```

**Idempotency Keys:**

For operations that should only happen once (reserving, confirming), we add an `Idempotency-Key` header:

```typescript
// POST with idempotency key
apiPost<Reservation>('/reserve', data, true);
// Adds header: Idempotency-Key: <uuid>

// If network fails and we retry with same key,
// backend returns cached response instead of creating duplicate
```

**Error Normalization:**

All API errors are normalized to a consistent format:

```typescript
interface ApiError {
  status: number;      // HTTP status
  code: string;        // Error code (e.g., "OUT_OF_STOCK")
  message: string;     // Human-readable
  details?: object;    // Extra context
  requestId?: string;  // For debugging
}
```

This allows the UI to handle errors consistently:
- Display user-friendly messages
- Show request ID for support
- Handle specific error codes differently

---

### 4. Error Handling Strategies

**Three Layers of Error Handling:**

1. **Global Error Boundary** (layout.tsx)
   - Catches React render errors
   - Shows fallback UI
   - Prevents app crashes

2. **Query Error Handling** (useQuery)
   - Catches API errors
   - Provides error state to components
   - Automatic retry for network errors

3. **Mutation Error Handling** (useMutation)
   - Shows toast notifications
   - Keeps UI responsive
   - Allows user to retry

**Error Display Pattern:**

```typescript
// Component handles both loading and error states
if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorAlert error={error} />;
return <DataView data={data} />;
```

**Defensive Programming:**

Always assume the API might return unexpected data:

```typescript
// Normalize arrays (handle single object responses)
const reservations = Array.isArray(rawReservations) 
  ? rawReservations 
  : rawReservations ? [rawReservations] : [];

// Safe property access
const count = data?.length ?? 0;
```

---

### 5. Component Architecture

**Three-Layer Component System:**

```
UI Components (shadcn/ui)
    ↓
UI Blocks (custom composed components)
    ↓
Page Components (route-specific)
```

**Layer 1: UI Components (Primitive)**
- From shadcn/ui
- Unstyled or minimally styled
- Highly reusable
- Examples: Button, Input, Card

**Layer 2: UI Blocks (Composed)**
- Domain-specific components
- Combine multiple UI components
- Handle common patterns
- Examples: ErrorAlert, EmptyState

```typescript
// ErrorAlert combines Alert, Button, and logic
function ErrorAlert({ error, onRetry }) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Error</AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
      {error.requestId && <CopyButton text={error.requestId} />}
      {onRetry && <Button onClick={onRetry}>Retry</Button>}
    </Alert>
  );
}
```

**Layer 3: Page Components (Route-Specific)**
- Use UI Blocks and UI Components
- Handle data fetching
- Route-specific logic
- Examples: ItemsPage, ItemDetailPage

---

### 6. Modern CSS with Tailwind v4

**Tailwind CSS v4 Features Used:**

1. **@theme Directive** - Define custom CSS variables
```css
@theme {
  --color-primary: hsl(var(--primary));
  --radius-lg: var(--radius);
}
```

2. **@utility Directive** - Create reusable utility classes
```css
@utility {
  .glass {
    backdrop-blur: 24px;
    background-color: rgba(255, 255, 255, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }
}
```

3. **CSS Custom Properties** - Dynamic theming
```css
:root {
  --primary: 262.1 83.3% 57.8%;
  --background: 0 0% 100%;
}
```

**Glass-morphism Design:**

The app uses a modern glass-morphism aesthetic:
- Semi-transparent backgrounds
- Backdrop blur effects
- Subtle borders and shadows
- Gradient accents

```css
.glass {
  backdrop-blur-xl bg-white/70 
  border border-white/20 
  shadow-xl rounded-xl
}
```

---

## Application Routes

### `/` - Home (Dashboard)
- Displays API health status
- Shows database and cache health
- Quick navigation links to Items and Reservations

### `/items` - Browse Items
- Grid view of all available items
- Stock level indicators
- Links to item detail pages

### `/items/[id]` - Item Detail
- Detailed item information
- **Reservation Form** with:
  - User ID input
  - Quantity selector (1-5)
  - Client-side validation
  - Idempotency key handling
- Real-time stock updates

### `/users/[userId]/reservations` - My Reservations
- List of all reservations for a user
- Active reservations with confirm/cancel actions
- Past reservations (completed/cancelled/expired)
- Status badges and expiration timers

---

## Component Library

### shadcn/ui Components

| Component | Usage |
|-----------|-------|
| `Button` | Actions, form submission |
| `Card` | Content containers |
| `Input` | Form fields |
| `Label` | Form labels |
| `Badge` | Status indicators |
| `Alert` | Error messages |
| `Table` | Reservations list |
| `Separator` | Visual dividers |
| `Sonner` | Toast notifications |

### Custom UI Blocks

| Component | Purpose |
|-----------|---------|
| `Shell` | App layout with navigation |
| `ErrorAlert` | API error display with request ID |
| `EmptyState` | Friendly empty state messages |
| `LoadingSkeleton` | Skeleton loaders for lists |
| `StatusBadge` | Reservation status badges |

---

## Testing

**Test Stack:**
- **Vitest** - Test runner (Vite-native)
- **React Testing Library** - Component testing
- **MSW** - API mocking
- **jsdom** - Browser environment

**Testing Philosophy:**

1. **Test Behavior, Not Implementation**
   ```typescript
   // Good - Tests what user sees
   expect(screen.getByText('Reserve Now')).toBeInTheDocument();
   
   // Avoid - Tests implementation details
   expect(component.state.isOpen).toBe(true);
   ```

2. **Mock at Network Level**
   ```typescript
   // MSW intercepts actual HTTP requests
   const server = setupServer(handlers);
   // Your code makes real requests, MSW returns mocks
   ```

3. **Fresh Data Per Test**
   ```typescript
   beforeEach(() => {
     resetMockData(); // Prevent test pollution
   });
   ```

**Running Tests:**

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run in watch mode
npm run test:watch
```

---

## Development Guidelines

### Adding New Pages

1. Create the route directory in `src/app/`
2. Add `page.tsx` with 'use client' directive for interactive pages
3. Use TanStack Query for data fetching
4. Add loading and error states
5. Update navigation in `Shell` component if needed

### Adding API Endpoints

1. Add type definitions in `src/lib/api/types.ts`
2. Add endpoint function in `src/lib/api/endpoints.ts`
3. Export from `src/lib/api/index.ts`
4. Use in components with `useQuery` or `useMutation`

### Form Best Practices

1. Define Zod schema for validation
2. Use `react-hook-form` with `zodResolver`
3. Show loading state during submission
4. Display success toast on completion
5. Show error with request ID on failure

---

## Troubleshooting

### Backend Connection Issues

**Problem:** "Unable to connect to the server" error

**Solution:**
1. Ensure backend is running on port 3000
2. Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local`
3. Verify CORS is configured correctly in backend

### CORS Errors

**Problem:** CORS errors in browser console

**Solution:**
Update backend `.env`:
```env
CORS_ORIGIN=http://localhost:3001
```

Or keep as `*` for development.

### Port Already in Use

**Problem:** "Port 3001 is already in use"

**Solution:**
```bash
# Find and kill process on port 3001
lsof -ti:3001 | xargs kill -9
```

### Build Errors

**Problem:** Module not found errors

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## Demo Flow

Here's a complete walkthrough of the application:

1. **Start both servers:**
   ```bash
   # Terminal 1 - Backend
   cd .. && npm run dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```

2. **Open the app:**
   Navigate to `http://localhost:3001`

3. **Check API status:**
   The home page shows if the backend is connected

4. **Browse items:**
   Click "Browse Items" or go to `/items`

5. **Make a reservation:**
   - Click on any item
   - Enter a user ID (default: `demo-user`)
   - Select quantity (1-5)
   - Click "Reserve Now"

6. **Manage reservations:**
   - Go to `/users/demo-user/reservations`
   - See your active reservation
   - Confirm or cancel as needed

7. **Verify idempotency:**
   - Try reserving the same item twice with the same Idempotency-Key
   - The second request returns the cached response

---

## Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| Next.js | React framework | 16.1.6 |
| React | UI library | 19.2.3 |
| TypeScript | Type safety | 5.x |
| Tailwind CSS | Styling | 4.x |
| shadcn/ui | Component library | Latest |
| TanStack Query | Server state | Latest |
| React Hook Form | Form handling | Latest |
| Zod | Validation | Latest |
| Lucide React | Icons | Latest |
| Vitest | Testing | Latest |
| MSW | API mocking | Latest |

---

## License

MIT - Same as the main project.

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review the main project README
3. Check browser console for error details
4. Note the Request ID from error messages for debugging
