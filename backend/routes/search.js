const router = require('express').Router();
const auth = require('../middleware/auth');
const { Task, Snippet, WikiPage, Project } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { q, workspaceId } = req.query;
    if (!q || !workspaceId) return res.json([]);

    const projects = await Project.find({ workspaceId }).select('_id');
    const projectIds = projects.map(p => p._id);

    const regex = new RegExp(q, 'i');

    const [tasks, snippets, wiki] = await Promise.all([
      Task.find({ projectId: { $in: projectIds }, $or: [{ title: regex }, { description: regex }] }).limit(10).select('title projectId status'),
      Snippet.find({ projectId: { $in: projectIds }, $or: [{ title: regex }, { code: regex }] }).limit(10).select('title projectId language'),
      WikiPage.find({ projectId: { $in: projectIds }, $or: [{ title: regex }, { content: regex }] }).limit(10).select('title projectId')
    ]);

    const results = [
      ...tasks.map(t => ({ id: t._id, type: 'task', title: t.title, projectId: t.projectId, badge: t.status })),
      ...snippets.map(s => ({ id: s._id, type: 'snippet', title: s.title, projectId: s.projectId, badge: s.language })),
      ...wiki.map(w => ({ id: w._id, type: 'wiki', title: w.title, projectId: w.projectId }))
    ];

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
