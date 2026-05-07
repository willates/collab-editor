# Architecture Note

## Overview

Collab Editor is a full-stack Next.js 14 application using the App Router. All server logic, API routes, and UI live in a single repository — no separate backend service.

## Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 14 (App Router) | Unified frontend + API in one project; server components reduce client JS |
| Editor | Tiptap v2 | ProseMirror-based, composable extensions, React bindings |
| ORM | Prisma | Type-safe database access, schema-as-code |
| Database | PostgreSQL via Supabase | Managed Postgres with connection pooling (pgBouncer) |
| Auth | iron-session | Minimal encrypted cookie session — no OAuth complexity |
| Styling | Tailwind CSS + Typography plugin | Utility-first, fast iteration |
| Deployment | Vercel | Native Next.js support, zero-config |

## Data Model

```
User
  id, email, passwordHash, createdAt

Document
  id, title, content (Json/Tiptap JSON), ownerId → User, createdAt, updatedAt

SharedAccess
  id, documentId → Document, userId → User, permission (VIEW|EDIT), grantedAt
  UNIQUE(documentId, userId)
```

`content` is stored as a JSON column containing the Tiptap/ProseMirror document tree. This allows structured traversal for Markdown export without parsing HTML.

## Request Flow

```
Browser → Next.js Route Handler → Prisma → Supabase (PostgreSQL)
                ↑
         iron-session cookie
         (verified on every request)
```

Server Components (dashboard, document page) fetch data directly via Prisma — no client-side API call needed for initial render. Client Components (editor, toolbar) talk to Route Handlers for mutations.

## Auth Design

- Login: bcrypt password compare → write encrypted iron-session cookie
- Every Route Handler calls `requireAuth()` which reads and decrypts the session cookie
- No JWTs, no refresh tokens — simplicity over feature richness given the scope

## Access Control

| Role | Can read | Can edit content | Can manage sharing |
|------|----------|-----------------|-------------------|
| Owner | ✓ | ✓ | ✓ |
| Shared (EDIT) | ✓ | ✓ | ✗ |
| Shared (VIEW) | ✓ | ✗ | ✗ |
| Unauthenticated | ✗ | ✗ | ✗ |

Access is enforced server-side on every `GET` and `PUT` — the client permission state is derived from what the server returns, not set independently.

## File Upload

`.txt` and `.md` files are read as plain text and converted to a minimal Tiptap JSON document (one paragraph node per line). No external parser is used.

## Export

- **PDF:** `window.print()` with `@media print` CSS that hides all chrome and renders the page at full width. The browser handles pagination.
- **Markdown:** Tiptap JSON is traversed server-free in the browser and converted to Markdown string, then downloaded as a `.md` blob.

## Tradeoffs Made

- **No real-time collaboration.** Autosave writes the full document on a 1.5 s debounce. True real-time (CRDT/OT via y-js or Liveblocks) was out of scope for the time budget.
- **No rich permission model.** VIEW vs EDIT covers the sharing use case without adding role tables.
- **Session secret in env.** Production would rotate this and use a secrets manager.
- **Connection pooling via pgBouncer.** Supabase requires `?pgbouncer=true` on the pooled URL and a separate `DIRECT_URL` for migrations. Both are set in `.env`.
