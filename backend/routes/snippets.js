const router = require('express').Router();
const auth = require('../middleware/auth');
const { Snippet } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { projectId } = req.query;
    const snippets = await Snippet.find({ projectId }).populate('authorId', 'name avatar').populate('linkedTaskId', 'title');
    res.json(snippets);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const snippet = await Snippet.create({ ...req.body, authorId: req.user._id });
    res.json(snippet);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const snippet = await Snippet.findById(req.params.id).populate('authorId', 'name avatar').populate('linkedTaskId', 'title');
    res.json(snippet);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const snippet = await Snippet.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(snippet);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const snippet = await Snippet.findByIdAndDelete(req.params.id);
    if (!snippet) return res.status(404).json({ error: 'Snippet not found' });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
