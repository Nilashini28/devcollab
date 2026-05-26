const router = require('express').Router();
const auth = require('../middleware/auth');
const { Project, Event } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    const projects = await Project.find({ workspaceId });
    res.json(projects);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    await Event.create({ workspaceId: project.workspaceId, projectId: project._id, actorId: req.user._id, type: 'project:created', payload: { name: project.name } });
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(project);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/seed', auth, async (req, res) => {
  try {
    const { Task, WikiPage, Snippet } = require('../models/index');
    const projectId = req.params.id;
    
    // 10 Tasks
    const tasks = [
      { title: 'Set up CI/CD pipeline', description: 'Configure GitHub actions', priority: 'P0', status: 'todo', order: 0 },
      { title: 'Design system tokens', description: 'Define colors and typography', priority: 'P1', status: 'todo', order: 1 },
      { title: 'Build auth middleware', description: 'Verify JWT tokens', priority: 'P0', status: 'todo', order: 2 },
      { title: 'Implement Socket.IO client', description: 'Real-time connections', priority: 'P1', status: 'inprogress', order: 0 },
      { title: 'Create Kanban board UI', description: 'Drag and drop', priority: 'P1', status: 'inprogress', order: 1 },
      { title: 'Database schema design', description: 'Mongoose models', priority: 'P2', status: 'inprogress', order: 2 },
      { title: 'User profile page', description: 'Avatar upload', priority: 'P2', status: 'inreview', order: 0 },
      { title: 'Notification system', description: 'Toasts and banners', priority: 'P1', status: 'inreview', order: 1 },
      { title: 'Project setup', description: 'Vite and Express setup', priority: 'P0', status: 'done', order: 0 },
      { title: 'Add linting', description: 'ESLint and Prettier', priority: 'P2', status: 'done', order: 1 },
    ].map(t => ({ ...t, projectId, createdBy: req.user._id }));
    await Task.insertMany(tasks);

    // 3 Wiki Pages
    const pages = [
      { title: 'Project Overview', content: '# Welcome to DevCollab\n\nThis project aims to unify your workflow.' },
      { title: 'API Documentation', content: '# API\n\nBase URL is `/api`\n\n- `POST /auth/login`\n- `GET /tasks`' },
      { title: 'Team Conventions', content: '# Conventions\n\n- Use camelCase\n- Write unit tests' },
    ].map(p => ({ ...p, projectId }));
    await WikiPage.insertMany(pages);

    // 4 Snippets
    const snippets = [
      { title: 'JWT helper', language: 'javascript', code: 'const verifyToken = (req, res) => {}' },
      { title: 'Data parser', language: 'python', code: 'def parse_data(raw):\n  return raw.strip()' },
      { title: 'Get Active Users', language: 'sql', code: 'SELECT * FROM users WHERE last_login > NOW() - INTERVAL 1 DAY;' },
      { title: 'Deploy script', language: 'bash', code: '#!/bin/bash\necho "Deploying..."\nnpm run build' },
    ].map(s => ({ ...s, projectId, createdBy: req.user._id }));
    await Snippet.insertMany(snippets);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
