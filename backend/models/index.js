const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  logo: { type: String, default: '' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: { type: String, enum: ['owner','admin','member','viewer'], default: 'member' } }],
  createdAt: { type: Date, default: Date.now }
});
const Workspace = mongoose.model('Workspace', workspaceSchema);

const projectSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  techStack: [{ type: String }],
  status: { type: String, enum: ['active','archived'], default: 'active' },
  colourLabel: { type: String, default: '#6366f1' },
  sprintStart: { type: Date },
  sprintEnd: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

const taskSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  priority: { type: String, enum: ['P0','P1','P2'], default: 'P2' },
  status: { type: String, enum: ['todo','inprogress','inreview','done'], default: 'todo' },
  order: { type: Number, default: 0 },
  labels: [{ type: String }],
  dueDate: { type: Date },
  linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  subTasks: [{ title: String, completed: { type: Boolean, default: false } }],
  attachments: [{ url: String, name: String }],
  history: [{ field: String, from: String, to: String, actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, timestamp: { type: Date, default: Date.now } }],
  columnEnteredAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const Task = mongoose.model('Task', taskSchema);

const commentSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body: { type: String, required: true },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});
const Comment = mongoose.model('Comment', commentSchema);

const snippetSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  title: { type: String, required: true },
  language: { type: String, default: 'javascript' },
  code: { type: String, required: true },
  tags: [{ type: String }],
  description: { type: String, default: '' },
  linkedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  aiReview: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});
const Snippet = mongoose.model('Snippet', snippetSchema);

const wikiPageSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiPage', default: null },
  title: { type: String, required: true },
  content: { type: String, default: '' },
  versions: [{ content: String, authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, savedAt: { type: Date, default: Date.now } }],
  linkedTaskIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
const WikiPage = mongoose.model('WikiPage', wikiPageSchema);

const eventSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  type: { type: String, required: true },
  payload: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});
const Event = mongoose.model('Event', eventSchema);

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String, default: '' },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Notification = mongoose.model('Notification', notificationSchema);

const inviteSchema = new mongoose.Schema({
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  email: { type: String, required: true },
  token: { type: String, required: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, default: 'member' },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
const Invite = mongoose.model('Invite', inviteSchema);

module.exports = { Workspace, Project, Task, Comment, Snippet, WikiPage, Event, Notification, Invite };
