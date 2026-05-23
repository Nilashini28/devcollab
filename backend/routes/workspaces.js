const router = require('express').Router();
const auth = require('../middleware/auth');
const { Workspace, Invite } = require('../models/index');
const User = require('../models/User');
const crypto = require('crypto');

router.get('/', auth, async (req, res) => {
  try {
    const workspaces = await Workspace.find({ 'members.userId': req.user._id }).populate('members.userId', 'name email avatar');
    res.json(workspaces);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/', auth, async (req, res) => {
  try {
    const { name, logo } = req.body;
    const workspace = await Workspace.create({
      name, logo,
      ownerId: req.user._id,
      members: [{ userId: req.user._id, role: 'owner' }]
    });
    res.json(workspace);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const ws = await Workspace.findById(req.params.id).populate('members.userId', 'name email avatar bio skills');
    res.json(ws);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/:id', auth, async (req, res) => {
  try {
    const ws = await Workspace.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ws);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/invite', auth, async (req, res) => {
  try {
    const { email, role } = req.body;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const invite = await Invite.create({ workspaceId: req.params.id, email, token, invitedBy: req.user._id, role, expiresAt });
    res.json({ invite, link: `/join/${token}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/join/:token', auth, async (req, res) => {
  try {
    const invite = await Invite.findOne({ token: req.params.token }).populate('workspaceId');
    if (!invite || invite.expiresAt < new Date()) return res.status(400).json({ error: 'Invite expired' });
    const ws = invite.workspaceId;
    const alreadyMember = ws.members.find(m => m.userId.toString() === req.user._id.toString());
    if (!alreadyMember) {
      ws.members.push({ userId: req.user._id, role: invite.role });
      await ws.save();
    }
    await Invite.deleteOne({ _id: invite._id });
    res.json(ws);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    await Workspace.findByIdAndUpdate(req.params.id, { $pull: { members: { userId: req.params.userId } } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
