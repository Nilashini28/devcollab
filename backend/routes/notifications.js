const router = require('express').Router();
const auth = require('../middleware/auth');
const { Notification } = require('../models/index');

router.get('/', auth, async (req, res) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id }).sort('-createdAt').limit(50);
    res.json(notifs);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/read-all', auth, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.json(notif);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
