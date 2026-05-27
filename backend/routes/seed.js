const router = require('express').Router();
const auth = require('../middleware/auth');
const { Task, WikiPage, Snippet } = require('../models/index');

router.post('/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Delete existing
    await Promise.all([
      Task.deleteMany({ projectId }),
      WikiPage.deleteMany({ projectId }),
      Snippet.deleteMany({ projectId })
    ]);

    const today = new Date();
    const addDays = (days) => {
      const d = new Date(today);
      d.setDate(d.getDate() + days);
      return d;
    };

    // Insert 10 tasks
    const tasksToInsert = [
      { projectId, title: "Set up CI/CD pipeline with GitHub Actions", priority: "P1", status: "todo", labels: ["devops", "core"], dueDate: addDays(3) },
      { projectId, title: "Design system \u2014 spacing tokens and typography", priority: "P2", status: "todo", labels: ["design"], dueDate: addDays(5) },
      { projectId, title: "Write unit tests for auth middleware", priority: "P1", status: "todo", labels: ["testing"], dueDate: addDays(4) },
      { projectId, title: "Build real-time notification system", priority: "P0", status: "inprogress", labels: ["feature", "realtime"], dueDate: addDays(-1), assigneeId: req.user.id },
      { projectId, title: "Implement OAuth login with Google", priority: "P1", status: "inprogress", labels: ["auth", "feature"], dueDate: addDays(2) },
      { projectId, title: "File attachment system for tasks", priority: "P2", status: "inprogress", labels: ["feature"], dueDate: addDays(6) },
      { projectId, title: "Conduct API security audit", priority: "P0", status: "inreview", labels: ["security"], dueDate: addDays(-2) },
      { projectId, title: "Optimise MongoDB query performance", priority: "P1", status: "inreview", labels: ["performance"], dueDate: addDays(1) },
      { projectId, title: "Set up Kanban board with dnd-kit", priority: "P0", status: "done", labels: ["core", "feature"], dueDate: addDays(-5) },
      { projectId, title: "Design database schema and relationships", priority: "P0", status: "done", labels: ["core"], dueDate: addDays(-6) }
    ];
    
    // Insert 3 wiki pages
    const wikiToInsert = [
      {
        projectId,
        title: "Project Overview",
        content: "# Project Overview\n\nWelcome to DevCollab, an AI-native project collaboration platform built specifically for developer teams. This platform seamlessly integrates Kanban boards, code snippets, and real-time wiki documentation to streamline our entire development lifecycle.\n\n## Core Features\n\n- **Real-time Sync**: We use Socket.IO to ensure that all tasks, presence indicators, and cursor movements are broadcasted instantly across all connected clients.\n- **AI Integration**: Powered by Anthropic Claude API, our platform provides automated code reviews, PR descriptions, and intelligent wiki summaries to boost productivity.\n- **Authentication**: JWT tokens are used for secure session management, stored safely in localStorage with strict expiration policies.\n\n## Architecture\n\nThe stack comprises a React frontend built with Vite and Tailwind CSS, communicating with a Node.js Express backend backed by a MongoDB database. This separation of concerns allows us to iterate rapidly while maintaining a robust and scalable infrastructure. All API endpoints follow RESTful conventions, and WebSocket rooms are segregated by project IDs to minimize unnecessary data transfer.\n\nOur immediate goal is to finalize the CI/CD pipelines to enable continuous delivery."
      },
      {
        projectId,
        title: "API Documentation",
        content: "# API Documentation\n\nThis document outlines the primary RESTful endpoints exposed by our backend service. All protected routes require a valid JWT bearer token in the Authorization header.\n\n## Endpoints\n\n### Authentication\n- `POST /api/auth/register` - Register a new user account.\n- `POST /api/auth/login` - Authenticate and retrieve a JWT token.\n\n### Projects\n- `GET /api/projects` - Retrieve all projects associated with the current workspace.\n- `POST /api/projects` - Create a new project. Requires `name` and `workspaceId`.\n- `GET /api/projects/:id` - Fetch project details by ID.\n\n### Tasks\n- `GET /api/tasks?projectId=XYZ` - Retrieve all tasks for a specific project.\n- `POST /api/tasks` - Create a new task. Body parameters include `title`, `description`, `priority`, and `status`.\n- `PUT /api/tasks/reorder` - Bulk update task ordering and status (drag-and-drop).\n\n### Real-time Events\nWebSockets are available at the root path (`/`). Key events include:\n- `join:project` - Subscribe to updates for a specific project.\n- `task:moved` - Broadcasted when a task changes column.\n- `cursor:move` - Live pointer coordinates for active presence."
      },
      {
        projectId,
        title: "Team Conventions",
        content: "# Team Conventions\n\nConsistency is key to our velocity. Please adhere to the following standards when contributing to the DevCollab repository.\n\n## Git Workflow\n\nWe utilize a simplified GitHub flow. \n- **Branches**: Create feature branches off `main` using the format `feat/your-feature-name` or `fix/issue-description`.\n- **Commits**: Use Conventional Commits. For example, `feat: add real-time presence` or `fix: resolve JWT expiration bug`. This allows automated changelog generation.\n- **PRs**: All Pull Requests must have a descriptive title and pass our CI checks before merging. Request at least one review from a team member.\n\n## Code Style\n\n- **Frontend**: Use functional components and Hooks. Avoid class components. For styling, rely exclusively on our custom CSS variables defined in `index.css` (e.g., `var(--bg-surface)`). Do not use hardcoded hex values.\n- **Backend**: Use `async/await` syntax and wrap route handlers in `try/catch` blocks. All environment variables must be validated at startup.\n\n## Database\n\n- Never execute raw queries; always use Mongoose models.\n- Ensure appropriate indexing on queried fields (e.g., `projectId`).\n- Soft deletes are currently not implemented, so tread carefully when using `.deleteMany()`."
      }
    ];

    // Insert 4 snippets
    const snippetsToInsert = [
      {
        projectId,
        title: "JWT Authentication Middleware",
        language: "javascript",
        code: "const jwt = require('jsonwebtoken');\n\nconst auth = (req, res, next) => {\n  try {\n    const token = req.header('Authorization')?.replace('Bearer ', '');\n    if (!token) {\n      return res.status(401).json({ error: 'Authentication required' });\n    }\n\n    const decoded = jwt.verify(token, process.env.JWT_SECRET);\n    req.user = decoded;\n    next();\n  } catch (err) {\n    res.status(401).json({ error: 'Invalid or expired token' });\n  }\n};\n\nmodule.exports = auth;"
      },
      {
        projectId,
        title: "useDebounce Hook",
        language: "typescript",
        code: "import { useState, useEffect } from 'react';\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debouncedValue, setDebouncedValue] = useState<T>(value);\n\n  useEffect(() => {\n    const handler = setTimeout(() => {\n      setDebouncedValue(value);\n    }, delay);\n\n    return () => {\n      clearTimeout(handler);\n    };\n  }, [value, delay]);\n\n  return debouncedValue;\n}"
      },
      {
        projectId,
        title: "MongoDB Aggregation Pipeline",
        language: "javascript",
        code: "const getProjectStats = async (projectId) => {\n  const stats = await Task.aggregate([\n    { $match: { projectId: new mongoose.Types.ObjectId(projectId) } },\n    {\n      $group: {\n        _id: '$status',\n        count: { $sum: 1 },\n        highPriority: {\n          $sum: { $cond: [{ $eq: ['$priority', 'P0'] }, 1, 0] }\n        }\n      }\n    },\n    { $sort: { count: -1 } }\n  ]);\n  \n  return stats;\n};"
      },
      {
        projectId,
        title: "Socket.IO Room Manager",
        language: "javascript",
        code: "const activeUsers = {};\n\nio.on('connection', (socket) => {\n  socket.on('join:project', ({ projectId, userId, userName }) => {\n    socket.join(`project:${projectId}`);\n    \n    if (!activeUsers[projectId]) {\n      activeUsers[projectId] = {};\n    }\n    \n    activeUsers[projectId][socket.id] = { userId, userName };\n    \n    io.to(`project:${projectId}`).emit(\n      'presence:update', \n      Object.values(activeUsers[projectId])\n    );\n  });\n});"
      }
    ];

    await Promise.all([
      Task.insertMany(tasksToInsert),
      WikiPage.insertMany(wikiToInsert),
      Snippet.insertMany(snippetsToInsert)
    ]);

    res.json({ ok: true, seeded: { tasks: 10, wiki: 3, snippets: 4 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
