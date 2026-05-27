const router = require('express').Router();
const auth = require('../middleware/auth');
const { Task, Snippet, WikiPage } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.json({ tasks: [], snippets: [], wiki: [] });
    }

    const regex = new RegExp(q, 'i');

    const [tasks, snippets, wiki] = await Promise.all([
      Task.find({ title: regex })
        .limit(5)
        .select('title priority status projectId'),
      Snippet.find({ $or: [{ title: regex }, { tags: regex }] })
        .limit(5)
        .select('title language projectId'),
      WikiPage.find({ title: regex })
        .limit(5)
        .select('title projectId')
    ]);

    res.json({ tasks, snippets, wiki });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
