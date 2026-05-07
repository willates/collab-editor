# Collab Editor

A lightweight collaborative document editor built with Next.js 14, Tiptap, Prisma, and Supabase.

## Features

- Rich text editing (bold, italic, underline, headings, lists)
- Text alignment (left, center, right, justify)
- Line spacing control (1, 1.15, 1.5, 2)
- Auto-save every 1.5 seconds
- Document sharing with Viewer or Editor permissions
- Remove shared users and update their access level
- Export to PDF (browser print) and Markdown download
- File upload — convert `.txt` and `.md` files into documents
- Session-based authentication (iron-session)

## Test Accounts

| Email | Password |
|-------|----------|
| alice@test.com | password123 |
| bob@test.com | password123 |

Alice owns a "Welcome Document" that is already shared with Bob (View only). Use this to test the sharing flow.

## Local Setup

### Prerequisites

- Node.js 18+ (https://nodejs.org)
- A Supabase project (https://supabase.com) — free tier works

### Steps

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd collab-editor
   npm install
   ```

2. **Environment variables**

   Copy the example file:
   ```bash
   cp .env.example .env.local
   ```

   Also create a `.env` file (Prisma reads this directly):
   ```bash
   cp .env.example .env
   ```

   Fill in both files:
   ```
   DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-1-[region].pooler.supabase.com:5432/postgres"
   SESSION_SECRET="any-random-string-at-least-32-characters-long"
   ```

   Get your connection strings from: Supabase Dashboard → Connect → ORM tab.

3. **Push schema to database**
   ```bash
   npm run db:push
   ```

4. **Seed test users**
   ```bash
   npm run db:seed
   ```

5. **Start the dev server**
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:seed` | Create test users and sample document |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables: `DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`
4. Add to build command: `prisma generate && next build`
5. Deploy
