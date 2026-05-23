const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  skills: [{ type: String }],
  githubUrl: { type: String, default: '' },
  plan: { type: String, enum: ['free', 'pro'], default: 'free' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.methods.matchPassword = async function(password) {
  return await bcrypt.compare(password, this.passwordHash);
};

userSchema.virtual('profileCompleteness').get(function() {
  let score = 0;
  if (this.avatar) score += 20;
  if (this.bio) score += 20;
  if (this.skills && this.skills.length > 0) score += 20;
  if (this.githubUrl) score += 20;
  score += 20; // base
  return score;
});

module.exports = mongoose.model('User', userSchema);
