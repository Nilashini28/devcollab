const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const { Workspace, Project, Task, Comment, Snippet, WikiPage, Event, Notification } = require('./models/index');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/devcollab';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing demo data
  const existingDemo = await User.findOne({ email: 'demo@devcollab.app' });
  if (existingDemo) {
    console.log('Demo data already exists, skipping seed');
    process.exit(0);
  }

  // Create users
  const passwordHash = await bcrypt.hash('Demo1234', 10);
  const demo = await User.create({ name: 'Alex Rivera', email: 'demo@devcollab.app', passwordHash, bio: 'Full-stack developer passionate about DevOps and clean code', skills: ['React', 'Node.js', 'MongoDB', 'Docker'], githubUrl: 'https://github.com/alexrivera', plan: 'pro' });
  const sara = await User.create({ name: 'Sara Chen', email: 'sara@devcollab.app', passwordHash, bio: 'Frontend specialist, UI/UX enthusiast', skills: ['React', 'TypeScript', 'Figma', 'CSS'], githubUrl: 'https://github.com/sarachen' });
  const mike = await User.create({ name: 'Mike Johnson', email: 'mike@devcollab.app', passwordHash, bio: 'Backend engineer, API design expert', skills: ['Node.js', 'Python', 'PostgreSQL', 'Redis'], githubUrl: 'https://github.com/mikejohnson' });
  const priya = await User.create({ name: 'Priya Patel', email: 'priya@devcollab.app', passwordHash, bio: 'DevOps & Security specialist', skills: ['Docker', 'Kubernetes', 'AWS', 'Security'], githubUrl: 'https://github.com/priyapatel' });

  // Create workspace
  const workspace = await Workspace.create({
    name: 'TaskFlow App',
    ownerId: demo._id,
    members: [
      { userId: demo._id, role: 'owner' },
      { userId: sara._id, role: 'admin' },
      { userId: mike._id, role: 'member' },
      { userId: priya._id, role: 'member' }
    ]
  });

  // Create projects
  const frontend = await Project.create({
    workspaceId: workspace._id,
    name: 'Frontend',
    description: 'React + Vite frontend application with real-time features',
    techStack: ['React', 'TypeScript', 'Tailwind CSS', 'Socket.IO', 'Vite'],
    status: 'active',
    colourLabel: '#6366f1',
    sprintStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    sprintEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  const backend = await Project.create({
    workspaceId: workspace._id,
    name: 'Backend API',
    description: 'Node.js + Express REST API with Socket.IO and MongoDB',
    techStack: ['Node.js', 'Express', 'MongoDB', 'Socket.IO', 'JWT'],
    status: 'active',
    colourLabel: '#10b981',
    sprintStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    sprintEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  // Create tasks for Frontend project
  const tasks = await Task.insertMany([
    { projectId: frontend._id, title: 'Set up Kanban board with dnd-kit', description: 'Implement drag-and-drop Kanban board using dnd-kit library with four columns: To Do, In Progress, In Review, Done', assigneeId: sara._id, priority: 'P1', status: 'done', labels: ['feature', 'core'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 5 * 86400000), dueDate: new Date(Date.now() - 2 * 86400000), subTasks: [{ title: 'Install dnd-kit', completed: true }, { title: 'Create column components', completed: true }, { title: 'Add drag handlers', completed: true }] },
    { projectId: frontend._id, title: 'Implement Socket.IO client for real-time sync', description: 'Connect frontend to Socket.IO server, handle task:moved, task:updated, task:created events', assigneeId: sara._id, priority: 'P0', status: 'done', labels: ['realtime', 'core'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 3 * 86400000), dueDate: new Date(Date.now() - 1 * 86400000) },
    { projectId: frontend._id, title: 'Build task creation modal with AI suggestions', description: 'Create modal for new tasks with title, description, assignee, priority, due date fields and AI name suggestions', assigneeId: demo._id, priority: 'P1', status: 'inprogress', labels: ['feature', 'ai'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 4 * 86400000), dueDate: new Date(Date.now() + 2 * 86400000), subTasks: [{ title: 'Basic form layout', completed: true }, { title: 'AI name suggestions', completed: false }, { title: 'Validation', completed: false }] },
    { projectId: frontend._id, title: 'Design system — CSS variables and dark mode', description: 'Define design tokens, implement dark mode toggle with prefers-color-scheme', assigneeId: sara._id, priority: 'P1', status: 'inprogress', labels: ['design', 'ux'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 2 * 86400000), dueDate: new Date(Date.now() + 3 * 86400000) },
    { projectId: frontend._id, title: 'Sprint Intelligence dashboard UI', description: 'Build the sprint analytics dashboard with health score, velocity chart, and at-risk tasks panel', assigneeId: demo._id, priority: 'P1', status: 'inreview', labels: ['ai', 'analytics'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 1 * 86400000), dueDate: new Date(Date.now() + 1 * 86400000) },
    { projectId: frontend._id, title: 'Code snippet manager with syntax highlighting', description: 'Build snippet CRUD interface with Prism.js syntax highlighting and AI review panel', assigneeId: sara._id, priority: 'P2', status: 'todo', labels: ['feature'], createdBy: demo._id, dueDate: new Date(Date.now() + 5 * 86400000) },
    { projectId: frontend._id, title: 'Wiki editor with TipTap', description: 'Implement rich text wiki editor with version history, page tree, and [[page link]] syntax', assigneeId: demo._id, priority: 'P1', status: 'todo', labels: ['feature', 'wiki'], createdBy: demo._id, dueDate: new Date(Date.now() + 6 * 86400000) },
    { projectId: frontend._id, title: 'Calendar view for tasks', description: 'Add calendar view using react-big-calendar plotted by due date', assigneeId: sara._id, priority: 'P2', status: 'todo', labels: ['feature'], createdBy: demo._id, dueDate: new Date(Date.now() + 8 * 86400000) },
  ]);

  const backendTasks = await Task.insertMany([
    { projectId: backend._id, title: 'JWT authentication — access + refresh tokens', description: 'Implement secure JWT auth with access tokens (15min) and refresh tokens (7d)', assigneeId: mike._id, priority: 'P0', status: 'done', labels: ['auth', 'security'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 6 * 86400000), dueDate: new Date(Date.now() - 3 * 86400000) },
    { projectId: backend._id, title: 'Socket.IO rooms and presence system', description: 'Implement project rooms, user presence tracking, and typing indicators', assigneeId: mike._id, priority: 'P0', status: 'done', labels: ['realtime', 'core'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 4 * 86400000) },
    { projectId: backend._id, title: 'Anthropic Claude AI integration', description: 'Integrate Claude claude-sonnet-4-20250514 for all AI features with structured JSON output and caching', assigneeId: demo._id, priority: 'P0', status: 'inprogress', labels: ['ai', 'core'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 3 * 86400000), dueDate: new Date(Date.now() + 2 * 86400000) },
    { projectId: backend._id, title: 'MongoDB schema design and indexing', description: 'Design all collections, add indexes for performance, implement cascading deletes', assigneeId: mike._id, priority: 'P1', status: 'inreview', labels: ['database'], createdBy: demo._id, columnEnteredAt: new Date(Date.now() - 1 * 86400000) },
    { projectId: backend._id, title: 'Rate limiting and API security', description: 'Add rate limiting to AI endpoints (20/hr), general API limiting, input validation', assigneeId: priya._id, priority: 'P1', status: 'todo', labels: ['security', 'devops'], createdBy: demo._id, dueDate: new Date(Date.now() + 4 * 86400000) },
    { projectId: backend._id, title: 'Deploy to Railway with CI/CD', description: 'Set up Railway deployment, environment variables, health checks, and GitHub Actions CI', assigneeId: priya._id, priority: 'P1', status: 'todo', labels: ['devops', 'deployment'], createdBy: demo._id, dueDate: new Date(Date.now() + 7 * 86400000) },
  ]);

  // Create snippets
  await Snippet.insertMany([
    {
      projectId: backend._id,
      title: 'JWT Token Generation Helper',
      language: 'javascript',
      code: `const jwt = require('jsonwebtoken');

function generateTokens(userId) {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  return { accessToken, refreshToken };
}

module.exports = { generateTokens };`,
      tags: ['auth', 'jwt', 'security'],
      description: 'Generates access and refresh token pair',
      authorId: mike._id,
      linkedTaskId: backendTasks[0]._id,
      aiReview: {
        score: 7,
        summary: 'Functional JWT helper but missing token expiry validation and the secret should have stronger entropy requirements.',
        issues: [
          { type: 'security', severity: 'critical', line: 4, message: 'JWT_SECRET may not exist — add fallback check or fail-fast on startup' },
          { type: 'security', severity: 'warning', line: 3, message: '15min expiry is good, but consider adding jti (JWT ID) for token revocation support' },
          { type: 'style', severity: 'info', line: 1, message: 'Consider using async/await pattern for future-proofing with async signing' }
        ],
        suggestions: ['Add startup validation that JWT_SECRET is set', 'Implement token blacklist for logout support', 'Add user role to token payload for RBAC']
      }
    },
    {
      projectId: backend._id,
      title: 'Socket.IO Room Manager',
      language: 'javascript',
      code: `const activeUsers = {};

function joinProjectRoom(socket, io, { projectId, userId, userName, avatar }) {
  socket.join(\`project:\${projectId}\`);
  if (!activeUsers[projectId]) activeUsers[projectId] = {};
  activeUsers[projectId][socket.id] = { userId, userName, avatar };
  io.to(\`project:\${projectId}\`).emit('presence:update', 
    Object.values(activeUsers[projectId])
  );
}

function leaveProjectRoom(socket, io, projectId) {
  socket.leave(\`project:\${projectId}\`);
  if (activeUsers[projectId]) {
    delete activeUsers[projectId][socket.id];
    io.to(\`project:\${projectId}\`).emit('presence:update',
      Object.values(activeUsers[projectId])
    );
  }
}

module.exports = { joinProjectRoom, leaveProjectRoom, activeUsers };`,
      tags: ['socket.io', 'realtime', 'presence'],
      description: 'Manages Socket.IO rooms for real-time project collaboration',
      authorId: mike._id,
      linkedTaskId: backendTasks[1]._id
    },
    {
      projectId: frontend._id,
      title: 'useSocket Custom Hook',
      language: 'javascript',
      code: `import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function useSocket(projectId, handlers) {
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') }
    });

    const socket = socketRef.current;
    socket.emit('join:project', { projectId });

    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      socket.emit('leave:project', { projectId });
      socket.disconnect();
    };
  }, [projectId]);

  return socketRef.current;
}`,
      tags: ['react', 'hooks', 'socket.io'],
      description: 'React hook for Socket.IO real-time events',
      authorId: sara._id,
      linkedTaskId: tasks[1]._id
    },
    {
      projectId: frontend._id,
      title: 'AI Task Breakdown API Call',
      language: 'typescript',
      code: `interface TaskBreakdownResult {
  tasks: {
    title: string;
    description: string;
    priority: 'P0' | 'P1' | 'P2';
    suggested_assignee: string | null;
    effort: 'XS' | 'S' | 'M' | 'L';
    isDuplicate: boolean;
  }[];
}

export async function generateTaskBreakdown(
  description: string,
  projectId: string,
  techStack: string[],
  members: { name: string; skills: string[] }[]
): Promise<TaskBreakdownResult> {
  const response = await fetch('/api/ai/task-breakdown', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: \`Bearer \${localStorage.getItem('token')}\`
    },
    body: JSON.stringify({ description, projectId, techStack, members })
  });
  if (!response.ok) throw new Error('AI service unavailable');
  return response.json();
}`,
      tags: ['typescript', 'ai', 'api'],
      description: 'TypeScript function for AI task breakdown API',
      authorId: demo._id,
      linkedTaskId: tasks[2]._id
    },
    {
      projectId: backend._id,
      title: 'Claude AI Helper with Caching',
      language: 'javascript',
      code: `const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

async function callClaude(system, prompt, maxTokens = 1000) {
  const cacheKey = \`\${system.slice(0,50)}:\${prompt.slice(0,100)}\`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: prompt }]
  });
  
  const result = response.content[0].text;
  cache.set(cacheKey, { data: result, ts: Date.now() });
  return result;
}

module.exports = { callClaude, getCached };`,
      tags: ['ai', 'anthropic', 'caching'],
      description: 'Anthropic Claude API wrapper with 30-minute caching',
      authorId: demo._id
    }
  ]);

  // Create wiki pages
  await WikiPage.insertMany([
    {
      projectId: frontend._id,
      title: 'Frontend Architecture Overview',
      content: `# Frontend Architecture Overview

## Stack
- **React 18** with Vite for fast development and production builds
- **Socket.IO Client** for real-time bidirectional communication
- **dnd-kit** for accessible drag-and-drop Kanban functionality
- **TipTap** for rich text editing in task descriptions and wiki
- **Recharts** for Sprint Intelligence data visualization

## Component Structure
The app follows a feature-based folder structure:
\`\`\`
src/
├── components/     # Reusable UI components
├── pages/          # Route-level page components
├── hooks/          # Custom React hooks (useSocket, useAuth, useProject)
├── context/        # Global state (AuthContext, ProjectContext)
└── utils/          # API calls, helpers
\`\`\`

## Real-time Architecture
All real-time updates flow through Socket.IO. When a user drags a task, a \`task:moved\` event is emitted to all users in the same project room. The \`useSocket\` hook abstracts this pattern.

## AI Integration
All AI features call the backend \`/api/ai/*\` endpoints. The frontend never holds an API key. Results are displayed in structured UI components based on the JSON response shape.

## State Management
We use React Context + local component state. No Redux needed at this scale.`,
      versions: [{ content: '# Frontend Architecture\n\nInitial draft', authorId: demo._id, savedAt: new Date(Date.now() - 5 * 86400000) }],
      linkedTaskIds: [tasks[0]._id, tasks[1]._id]
    },
    {
      projectId: backend._id,
      title: 'Auth Flow Documentation',
      content: `# Authentication Flow

## Overview
DevCollab uses JWT-based stateless authentication with access + refresh token pattern.

## Flow
1. User registers or logs in via \`POST /api/auth/login\`
2. Server returns \`{ token, user }\` — token is a JWT signed with \`JWT_SECRET\`
3. Frontend stores token in \`localStorage\`
4. All API requests include \`Authorization: Bearer <token>\` header
5. \`auth\` middleware validates token on every protected route

## Token Expiry
- Access token: 7 days (for demo simplicity)
- Production recommendation: 15min access + 7d refresh

## Security Considerations
- Passwords are hashed with bcrypt (10 rounds)
- JWT secret is loaded from environment variables
- Rate limiting prevents brute force on auth endpoints`,
      versions: [{ content: '# Auth Flow\n\nTODO: document this', authorId: mike._id, savedAt: new Date(Date.now() - 3 * 86400000) }],
      linkedTaskIds: [backendTasks[0]._id]
    },
    {
      projectId: backend._id,
      title: 'API Reference',
      content: `# API Reference

## Base URL
\`http://localhost:5000/api\` (dev) | \`https://your-app.railway.app/api\` (prod)

## Auth
All endpoints (except \`/auth/register\` and \`/auth/login\`) require:
\`\`\`
Authorization: Bearer <token>
\`\`\`

## Endpoints

### Auth
- \`POST /auth/register\` — Create account
- \`POST /auth/login\` — Login, returns token
- \`GET /auth/me\` — Get current user
- \`PUT /auth/profile\` — Update profile

### Tasks
- \`GET /tasks?projectId=\` — List tasks
- \`POST /tasks\` — Create task
- \`PUT /tasks/:id\` — Update task (triggers Socket.IO broadcast)
- \`DELETE /tasks/:id\` — Delete task

### AI
- \`POST /ai/task-breakdown\` — Generate subtasks from description
- \`POST /ai/code-review\` — Review a code snippet
- \`POST /ai/standup\` — Generate standup from activity
- \`POST /ai/sprint-intelligence\` — Sprint health analysis
- \`POST /ai/devmind\` — Ambient project alerts
- \`POST /ai/suggest-links\` — Semantic task linking
- \`POST /ai/explain-codebase\` — Codebase architecture summary`,
      versions: []
    }
  ]);

  // Create events
  const eventData = [
    { projectId: frontend._id, actorId: sara._id, type: 'task:moved', payload: { title: 'Set up Kanban board', from: 'inprogress', to: 'done' } },
    { projectId: frontend._id, actorId: sara._id, type: 'task:moved', payload: { title: 'Implement Socket.IO client', from: 'inreview', to: 'done' } },
    { projectId: frontend._id, actorId: demo._id, type: 'task:created', payload: { title: 'Sprint Intelligence dashboard UI' } },
    { projectId: backend._id, actorId: mike._id, type: 'task:moved', payload: { title: 'JWT authentication', from: 'inreview', to: 'done' } },
    { projectId: backend._id, actorId: mike._id, type: 'task:moved', payload: { title: 'Socket.IO rooms', from: 'inprogress', to: 'done' } },
    { projectId: backend._id, actorId: demo._id, type: 'snippet:created', payload: { title: 'Claude AI Helper with Caching' } },
    { projectId: frontend._id, actorId: sara._id, type: 'wiki:updated', payload: { title: 'Frontend Architecture Overview' } },
    { projectId: backend._id, actorId: mike._id, type: 'comment:added', payload: { taskTitle: 'JWT authentication' } },
  ];
  for (let i = 0; i < eventData.length; i++) {
    await Event.create({ ...eventData[i], workspaceId: workspace._id, createdAt: new Date(Date.now() - (eventData.length - i) * 3 * 60 * 60 * 1000) });
  }

  // Create notifications for demo user
  await Notification.insertMany([
    { userId: demo._id, type: 'task:assigned', message: 'You were assigned "Anthropic Claude AI integration"', link: '/tasks', read: false },
    { userId: demo._id, type: 'mention', message: 'Sara mentioned you in "Set up Kanban board"', link: '/tasks', read: false },
    { userId: demo._id, type: 'ai:alert', message: 'DevMind: 2 tasks have been In Progress for 4+ days', link: '/sprint', read: true },
  ]);

  console.log('✅ Demo data seeded successfully!');
  console.log('Login: demo@devcollab.app / Demo1234');
  process.exit(0);
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
