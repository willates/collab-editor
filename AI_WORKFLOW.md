# AI Workflow Note

## How I Used AI in This Project

This project was scaffolded and developed collaboratively with Claude Code (Anthropic), used as a senior pair-programmer — not as a code generator to paste blindly.

## What AI Did

### Initial Scaffolding
I described the full stack (Next.js 14, Tiptap, Prisma, Supabase, iron-session) and the feature set in a single prompt. Claude generated the complete project skeleton: all file structure, Prisma schema, API routes, auth logic, components, and seed script in one pass.

This saved approximately 2–3 hours of boilerplate setup and let me focus immediately on product decisions rather than configuration.

### Iterative Feature Development
Each feature addition (line spacing, text alignment, export, enhanced sharing with permission levels) was implemented by describing the desired behavior, reviewing the generated code, and confirming or correcting it. Code was read before being accepted — I did not paste AI output without understanding it.

### Bug Diagnosis
When saved content disappeared on page refresh, I used the browser Network tab to confirm saves were succeeding (HTTP 200). This ruled out the write path. Claude identified the cause as Next.js aggressive page caching and added `export const dynamic = 'force-dynamic'` to the document page. I verified this fix made sense before applying it.

### Documentation
README, ARCHITECTURE, and SUBMISSION docs were drafted by Claude based on the actual codebase — not generic templates. I reviewed them for accuracy.

## What I Did

- Drove all product decisions: what to build, what to scope out, what tradeoffs to accept
- Verified every piece of code against the actual behavior (browser testing, network inspection)
- Caught and corrected issues (e.g. duplicate user in share list, missing DIRECT_URL env var)
- Made all architectural decisions: auth strategy, permission model, export approach
- Set up all external services: Supabase project, environment config, Vercel deployment

## Engineering Standards Maintained

- No code was accepted without being read and understood
- AI-suggested code was tested against real behavior, not assumed correct
- When AI output had issues (e.g. duplicate share entries), the root cause was diagnosed before applying the fix
- The codebase is TypeScript throughout with strict mode — AI was held to the same standard as handwritten code

## What AI Is Not Good At Here

- Knowing the live state of external services (Supabase UI changes, Vercel config)
- Replacing judgment calls: what to include given a 4-hour constraint, what to scope out
- Verifying that behavior actually works — only browser testing does that
