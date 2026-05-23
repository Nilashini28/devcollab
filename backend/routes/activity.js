const router = require('express').Router();
const auth = require('../middleware/auth');
const { Event } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { projectId, workspaceId, limit = 50 } = req.query;
    const query = {};
    if (projectId) query.projectId = projectId;
    if (workspaceId) query.workspaceId = workspaceId;
    const events = await Event.find(query).sort('-createdAt').limit(parseInt(limit)).populate('actorId', 'name avatar').populate('projectId', 'name');
    res.json(events);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
