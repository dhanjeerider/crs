# Fluxgate

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dhanjeerider/All-origin-cors-proxy)

A production-ready full-stack application template built on Cloudflare Workers. This template provides a seamless development experience with a React frontend, serverless backend using Hono, persistent storage via Durable Objects, and modern UI components powered by shadcn/ui and Tailwind CSS.

## Features

- **Full-Stack TypeScript**: End-to-end type safety across frontend and backend.
- **Cloudflare Workers**: Lightning-fast serverless backend with Hono routing.
- **Durable Objects**: Built-in stateful storage for counters, lists, and global data.
- **React 18 + Vite**: High-performance frontend bundling and hot module replacement.
- **shadcn/ui**: Beautiful, customizable UI components with Tailwind CSS.
- **TanStack Query**: Robust data fetching, caching, and synchronization.
- **Theme Support**: Dark/light mode with automatic system preference detection.
- **Error Handling**: Client and server-side error reporting.
- **Responsive Design**: Mobile-first layout with sidebar support.
- **Production Optimized**: Minified builds, Tailwind purging, and Cloudflare deployment ready.

## Tech Stack

- **Backend**: Cloudflare Workers, Hono, Durable Objects
- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Data**: TanStack Query, Zustand (state), Immer
- **UI/UX**: Lucide React icons, Sonner (toasts), Framer Motion (animations)
- **Dev Tools**: Bun (package manager), ESLint, TypeScript strict mode
- **Other**: React Router, Zod (validation), UUID

## Quick Start

1. **Clone and Install**:
   ```bash
   git clone <your-repo>
   cd fluxgate-bqfe8yasi7b7bdfvh2qrw
   bun install
   ```

2. **Development**:
   ```bash
   bun dev
   ```
   Opens at `http://localhost:3000` (frontend) and exposes API at `/api/*`.

3. **Build and Preview**:
   ```bash
   bun build
   bun preview
   ```

## Installation

This project uses **Bun** as the package manager and runtime.

```bash
# Install dependencies
bun install

# Generate Cloudflare types (if needed)
bun cf-typegen
```

Ensure you have:
- Bun 1.0+ installed (`curl -fsSL https://bun.sh/install | bash`)
- Cloudflare Wrangler CLI (`bunx wrangler@latest`)

## Development

### Running the App

- **Frontend + Backend**: `bun dev` (starts Vite dev server with Workers proxy)
- **Worker Only**: `bunx wrangler dev` (direct Worker development)
- **Type Generation**: `bun cf-typegen` (updates `worker/types.ts`)

### Project Structure

```
├── src/              # React frontend (pages, components, hooks)
├── worker/           # Cloudflare Workers backend (routes, Durable Objects)
├── shared/           # Shared types and mock data
├── tailwind.config.js # Tailwind + shadcn/ui config
└── wrangler.jsonc    # Cloudflare deployment config
```

### Adding Routes

Extend your API in `worker/userRoutes.ts`:
```typescript
// Example: GET /api/demo (fetches from Durable Object)
app.get('/api/demo', async (c) => {
  // Uses GlobalDurableObject for persistent storage
});
```

**Core Utilities** (`worker/core-utils.ts`): Do not modify. Provides `Env` types and Durable Object binding.

### UI Customization

- Edit `src/pages/HomePage.tsx` for your app's homepage.
- Use `AppLayout` from `src/components/layout/AppLayout.tsx` for sidebar layouts.
- shadcn/ui components available in `src/components/ui/*`.
- Tailwind config in `tailwind.config.js` with custom animations and gradients.

### Key APIs (Examples)

All APIs under `/api/*` with CORS enabled:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/test` | GET | Basic test response |
| `/api/counter` | GET | Get global counter value |
| `/api/counter/increment` | POST | Increment counter |
| `/api/demo` | GET | List demo items |
| `/api/demo` | POST | Add demo item |
| `/api/demo/:id` | PUT/DELETE | Update/delete item |
| `/api/client-errors` | POST | Report frontend errors |

Responses follow `{ success: boolean, data?: T, error?: string }`.

## Deployment

Deploy to Cloudflare Workers with one command:

```bash
bun run deploy
```

Or manually:

```bash
bun build  # Build frontend assets
bunx wrangler deploy
```

### Production Setup

1. **Configure Wrangler**: Update `wrangler.jsonc` with your account ID if needed.
2. **Custom Domain**: Set in Cloudflare Dashboard after deployment.
3. **Environment Variables**: Add via `wrangler secret put` or Dashboard.
4. **Durable Objects**: Auto-migrated via `migrations` in `wrangler.jsonc`.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/dhanjeerider/All-origin-cors-proxy)

## Linting & Formatting

```bash
bun lint  # ESLint
```

## Troubleshooting

- **Worker Routes Fail**: Check `userRoutes.ts` exports `userRoutes(app)`.
- **Types Missing**: Run `bun cf-typegen`.
- **CORS Issues**: All `/api/*` routes have CORS middleware.
- **Build Errors**: Ensure Bun is up-to-date; clear `.tmp` cache.

## License

MIT License. See [LICENSE](LICENSE) for details.

---

⭐ **Star this repo if you find it useful!** 🚀