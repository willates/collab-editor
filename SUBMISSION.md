# Submission

## What Is Included

| Item | Location |
|------|----------|
| Source code | This repository |
| Local setup instructions | `README.md` |
| Architecture note | `ARCHITECTURE.md` |
| AI workflow note | `AI_WORKFLOW.md` |
| This file | `SUBMISSION.md` |
| Live deployment URL | See below |
| Test credentials | See below |
| Walkthrough video URL | `WALKTHROUGH.txt` |

## Live Deployment

**URL:** _(add Vercel URL here after deploy)_

## Test Credentials

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Alice | alice@test.com | password123 | Owner of "Welcome Document" |
| Bob | bob@test.com | password123 | Shared viewer of "Welcome Document" |

## How to Test the Key Flows

### Authentication
1. Go to the live URL — you are redirected to `/login`
2. Log in as `alice@test.com` / `password123`

### Document Editing
1. Click **+ New Document**
2. Type a title in the top bar
3. Type content in the page area
4. Use toolbar: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), headings, lists, alignment, line spacing
5. Wait 1.5 seconds — status shows "Saved"
6. Refresh — content persists

### Sharing (Viewer)
1. Open any document you own
2. Click **Share**
3. Enter `bob@test.com`, select **Viewer**, click Share
4. Log out, log in as Bob
5. Click "Shared with Me" tab — document appears
6. Open it — editor is read-only

### Sharing (Editor)
1. Log back in as Alice
2. Open the same document → Share → change Bob's permission to **Editor** (or share a new doc with Editor)
3. Log in as Bob — document is now editable

### Remove Access
1. As Alice, open Share panel
2. Click **Remove** next to Bob — he loses access immediately

### File Upload
1. On the dashboard, click **Upload .txt/.md**
2. Select any `.txt` or `.md` file from your computer
3. It opens as a new document

### Export
1. Inside any document, click **Export ▾**
2. **Export as PDF** — opens browser print dialog
3. **Export as Markdown** — downloads a `.md` file

## What Is Working

- Full authentication (iron-session, login/logout)
- Create, rename, delete, and open documents
- Rich Tiptap editor: bold, italic, underline, strikethrough, headings, bullet & ordered lists, alignment, line spacing, font size, text color, highlight color, subscript/superscript, inline code, blockquote, clear formatting, tab key indent
- Autosave with 1.5 s debounce; "Saved at HH:MM" timestamp
- Share modal: share with viewer or editor permission, change permission, remove access
- Viewer banner for read-only shared documents
- File upload (.txt / .md → Tiptap JSON)
- Export as PDF (print dialog) and Markdown (download)
- Page-layout view (816 px white page on grey background, multi-page via ResizeObserver)
- Dashboard tabs: My Documents / Shared with Me; delete owned documents

## What Is Incomplete / Known Issues

- Real-time collaborative editing (requires y-js / WebSocket infrastructure — out of scope)
- Backspace from a paragraph immediately below a list can occasionally still trigger a join if the browser's native event fires before Tiptap's handler; workaround: press Backspace twice
- Image embedding not implemented
- Document version history not implemented
- Email notifications on share not implemented

## What I Would Build Next (given 2-4 more hours)

1. Real-time collaboration via Yjs + Tiptap collaboration extension
2. Inline image upload / paste support
3. Comment threads (similar to Google Docs suggestions)
4. Version history / named snapshots
