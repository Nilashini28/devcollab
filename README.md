# DevCollab — AI-Native Real-Time Project Collaboration Platform

> One workspace for your team to plan, build, review, and ship — with an AI that knows your project context.

## Live Demo
Demo login: `demo@devcollab.app` / `Demo1234`

## Features
- 🤖 **AI Task Breakdown** — describe a feature, get 5–8 subtasks with priorities and assignees matched to team skills
- 🔍 **Context-Aware Code Review** — reviews code against your task description and project snippets
- 📋 **AI Standup Generator** — reads 24hr activity log, generates Yesterday/Today/Blockers report
- 📊 **Sprint Intelligence Dashboard** — health score, velocity chart, at-risk predictions, AI retrospective
- 🧠 **DevMind Alerts** — ambient AI watches your project and surfaces blockers, orphan snippets, stale wiki pages
- 🔗 **AI Task Linking** — semantic similarity suggests related tasks as you create new ones
- 🏗 **Explain Codebase** — one click generates a full architecture summary saved to your wiki
- 🚀 **PR Description Generator** — paste a diff, get a full PR description (Innovation #1)
- ✏ **AI Task Naming** — vague title? AI suggests 3 sharper alternatives (Innovation #2)
- ⚡ **Real-time Kanban** — Socket.IO drag-and-drop syncs across all users instantly
- 👁 **Live Presence** — see who's viewing the board and who's typing in a task
- 📚 **Wiki with Version History** — TipTap-powered editor with diffs and restore
- 💻 **Code Snippet Manager** — syntax highlighting, tagging, task linking
- 🌙 **Dark Mode** — full system and manual toggle

## Beyond the Spec
### 1. PR Description Generator (`/project/:id/snippets` → PR gen button)
Paste a git diff and a list of changed files. Claude generates a full GitHub-ready PR description with summary, change list, and testing notes. Solves the real problem of developers spending 15+ minutes writing PR descriptions that still miss context.

### 2. AI Task Naming Assistant
When a task title is vague (< 5 words, no action verb), the AI silently suggests 3 sharper alternatives inline in the create modal. Solves sprint planning debt where vague task names ("auth stuff") make velocity tracking impossible.

## Architecture
```
Browser (React + Vite)
     ↕ HTTP (axios) + WebSocket (socket.io-client)
Express + Socket.IO (Node.js)
     ↕ Mongoose
MongoDB Atlas
     ↕ @anthropic-ai/sdk
Claude claude-sonnet-4-20250514 (via Anthropic API)
```

## AI Integration
- **Model**: `claude-sonnet-4-20250514` via `@anthropic-ai/sdk`
- **All AI endpoints**: `/api/ai/*` — API key never exposed to frontend
- **Context passed**: task list, tech stack, member skills, snippets, wiki pages, activity events
- **Output**: structured JSON for every feature — enables reliable UI rendering
- **Caching**: 30-minute in-memory cache on DevMind and Sprint Intelligence endpoints
- **Rate limiting**: 20 AI calls/hour per user
- **Fallback**: every AI call has try/catch — feature degrades cleanly

## Setup & Run Locally

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Anthropic API key (https://console.anthropic.com)

### Backend
```bash
cd backend
cp .env.example .env
# Edit .env: set MONGO_URI and ANTHROPIC_API_KEY
npm install
npm run seed    # Seeds demo data
npm run dev     # Starts on port 5000
```

### Frontend
```bash
cd frontend
cp .env.example .env
# Edit .env if backend URL differs
npm install
npm run dev     # Starts on port 3000
```

### Access
- App: http://localhost:3000
- Demo login: `demo@devcollab.app` / `Demo1234`

## Tech Stack
| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast HMR, Vercel-deployable |
| Routing | React Router v6 | De-facto standard |
| Real-time | Socket.IO | Rooms, presence, events |
| Backend | Node.js + Express | Fast to write, same language |
| Database | MongoDB + Mongoose | Flexible schema |
| Auth | JWT (7d expiry) | Stateless, standard |
| Drag & Drop | dnd-kit | Lighter than react-beautiful-dnd |
| Charts | Recharts | Simple, composable |
| AI | Anthropic Claude claude-sonnet-4-20250514 | Best JSON reliability |
| Styling | Custom CSS variables | Full design system control |

## Deployment
- **Frontend** → Vercel: `cd frontend && npm run build`, deploy `dist/`
- **Backend** → Railway: set env vars, deploy `/backend`, Railway auto-detects Node.js

## Team
Built for DevFusion Hackathon 2.0

## Pre-seeded Demo Data
- Workspace: "TaskFlow App"
- Projects: "Frontend" and "Backend API"  
- 14 tasks across all four Kanban columns
- 5 code snippets in JavaScript and TypeScript (one pre-reviewed)
- 3 wiki pages including Auth Flow and API Reference
- Full activity log and notifications
