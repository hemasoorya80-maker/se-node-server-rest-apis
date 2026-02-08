# Reservation System Frontend

A modern, production-ready Next.js 16 frontend for the Reservation System API. Built with the latest React patterns, TypeScript, Tailwind CSS, and shadcn/ui.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=flat-square&logo=tailwind-css)

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Start the Backend](#1-start-the-backend-port-3000)
  - [2. Start the Frontend](#2-start-the-frontend-port-3001)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Project Architecture](#project-architecture)
- [Key Features](#key-features)
- [Application Routes](#application-routes)
- [API Integration](#api-integration)
- [State Management](#state-management)
- [Forms & Validation](#forms--validation)
- [Component Library](#component-library)
- [Error Handling](#error-handling)
- [Development Guidelines](#development-guidelines)
- [Troubleshooting](#troubleshooting)

---

## Overview

This frontend application provides a complete user interface for the Reservation System API. It allows users to:

- Browse available inventory items
- View item details and stock levels
- Make reservations with automatic expiration
- Confirm or cancel existing reservations
- Monitor system health status

The application demonstrates modern React development practices including server state management with TanStack Query, form handling with React Hook Form, and a polished UI with shadcn/ui components.

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
│   └── ...
├── public/                     # Static assets
├── .env.local                  # Environment variables
├── next.config.ts              # Next.js configuration
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## Key Features

### 🎨 Modern UI
- Built with **shadcn/ui** components
- **Tailwind CSS** for styling
- Responsive design for all screen sizes
- Dark/light mode support (system preference)

### 🔄 State Management
- **TanStack Query** for server state
- Automatic caching and background refetching
- Optimistic updates for mutations
- Query invalidation for data consistency

### ✅ Forms & Validation
- **React Hook Form** for form handling
- **Zod** for runtime validation
- Client-side validation mirroring backend rules
- Error display with request IDs for debugging

### 🛡️ Error Handling
- Global error boundary
- API error normalization
- User-friendly error messages
- Request ID tracking for support

### ⚡ Performance
- Turbopack for fast development builds
- Code splitting by route
- Image optimization
- Static page generation where possible

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

## API Integration

### HTTP Client (`src/lib/api/client.ts`)

Centralized API client that handles:
- Request/response formatting
- Error normalization
- Idempotency key generation for POST requests
- Automatic header injection

```typescript
// Example usage
const items = await apiGet<Item[]>('/items');
const reservation = await apiPost<Reservation>('/reserve', data, true);
```

### Endpoints (`src/lib/api/endpoints.ts`)

Typed functions for each API endpoint:

| Function | Description | Idempotent |
|----------|-------------|------------|
| `listItems()` | Get all items | No |
| `getItem(id)` | Get single item | No |
| `reserveItem(data)` | Create reservation | **Yes** |
| `getReservationsByUser(userId)` | Get user reservations | No |
| `confirmReservation(data)` | Confirm reservation | **Yes** |
| `cancelReservation(data)` | Cancel reservation | No |
| `checkHealth()` | API health check | No |

---

## State Management

### Query Keys (`src/lib/query/keys.ts`)

Centralized query keys for cache management:

```typescript
queryKeys.items           // ["items"]
queryKeys.item(id)        // ["item", itemId]
queryKeys.reservations(userId)  // ["reservations", userId]
queryKeys.health          // ["health"]
```

### Cache Invalidation

After mutations, queries are automatically invalidated:

- **After Reserve:**
  - `queryKeys.items`
  - `queryKeys.item(itemId)`
  - `queryKeys.reservations(userId)`

- **After Confirm/Cancel:**
  - `queryKeys.reservations(userId)`
  - `queryKeys.items`
  - `queryKeys.item(itemId)` (if known)

---

## Forms & Validation

### Reserve Form Schema

```typescript
const reserveSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  qty: z.number().int().min(1).max(5),
});
```

### Features
- Real-time validation
- Disabled submit while pending
- Success/error toasts
- Request ID display on errors

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

### Custom Components

| Component | Purpose |
|-----------|---------|
| `Shell` | App layout with navigation |
| `ErrorAlert` | API error display with request ID |
| `EmptyState` | Friendly empty state messages |
| `LoadingSkeleton` | Skeleton loaders for lists |
| `StatusBadge` | Reservation status badges |

---

## Error Handling

### API Errors

API errors are normalized to a consistent format:

```typescript
interface ApiError {
  status: number;      // HTTP status code
  code: string;        // Error code (e.g., "OUT_OF_STOCK")
  message: string;     // Human-readable message
  details?: object;    // Additional details
  requestId?: string;  // For debugging
}
```

### Error Display

Errors are displayed in the UI with:
- Clear error message
- Error code badge
- Request ID (copyable)
- Retry button (where applicable)

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
