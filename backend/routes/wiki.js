const router = require('express').Router();
const auth = require('../middleware/auth');
const { WikiPage, Event } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    const pages = await WikiPage.find({ projectId }).select('-versions -content').populate('linkedTaskIds', 'title');
    res.json(pages);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const page = await WikiPage.create(req.body);
    await Event.create({ projectId: page.projectId, actorId: req.user._id, type: 'wiki:created', payload: { pageId: page._id, title: page.title } });
    res.json(page);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const page = await WikiPage.findById(req.params.id).populate('linkedTaskIds', 'title status');
    res.json(page);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const old = await WikiPage.findById(req.params.id);
    const versionEntry = { content: old.content, authorId: req.user._id };
    const page = await WikiPage.findByIdAndUpdate(req.params.id, { ...req.body, updatedAt: new Date(), $push: { versions: versionEntry } }, { new: true });
    await Event.create({ projectId: page.projectId, actorId: req.user._id, type: 'wiki:updated', payload: { pageId: page._id, title: page.title } });
    res.json(page);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await WikiPage.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
