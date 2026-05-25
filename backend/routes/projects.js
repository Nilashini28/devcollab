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

module.exports = router;
