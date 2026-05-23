const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'devcollab_secret_2024';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ error: 'Email already in use' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar, plan: user.plan } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { _id: user._id, name: user.name, email: user.email, avatar: user.avatar, bio: user.bio, skills: user.skills, githubUrl: user.githubUrl, plan: user.plan } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/me', require('../middleware/auth'), async (req, res) => {
  res.json(req.user);
});

router.put('/profile', require('../middleware/auth'), async (req, res) => {
  try {
    const { name, bio, skills, githubUrl, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, bio, skills, githubUrl, avatar }, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/upgrade', require('../middleware/auth'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, { plan: 'pro' }, { new: true }).select('-passwordHash');
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
