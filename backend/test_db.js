const mongoose = require('mongoose');
const { Workspace, User, Project } = require('./models/index');

mongoose.connect('mongodb://localhost:27017/devcollab').then(async () => {
  const users = await User.find({});
  console.log('Users:', users.map(u => u.email));
  if (users.length > 0) {
    const user = users[0];
    const workspaces = await Workspace.find({ 'members.userId': user._id }).populate('members.userId', 'name email avatar');
    console.log('Workspaces length:', workspaces.length);
    console.log('Is Array?', Array.isArray(workspaces));
  }
  process.exit(0);
});
