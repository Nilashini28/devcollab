const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
app.set('trust proxy', 1); // Fix for express-rate-limit behind Render proxy
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});
// backend/server.js — replace the generic cors() line
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/workspaces', require('./routes/workspaces'));
app.use('/api/projects', require('./routes/projects'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/snippets', require('./routes/snippets'));
app.use('/api/wiki', require('./routes/wiki'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/search', require('./routes/search'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity', require('./routes/activity'));

app.get('/api/seed-database', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const User = require('./models/User');
    const { Workspace, Project, Task, WikiPage } = require('./models/index');
    await Promise.all([ User.deleteMany({}), Workspace.deleteMany({}), Project.deleteMany({}), Task.deleteMany({}), WikiPage.deleteMany({}) ]);
    const passwordHash = await bcrypt.hash('password123', 10);
    const user = await User.create({ name: 'Demo Judge', email: 'judge@demo.com', passwordHash: passwordHash });
    const workspace = await Workspace.create({ name: 'Hackathon Workspace', ownerId: user._id, members: [{ userId: user._id, role: 'admin' }] });
    const project = await Project.create({ workspaceId: workspace._id, name: 'DevCollab Demo App', description: 'A platform to help student developers collaborate in real-time.', techStack: ['React', 'Node.js', 'MongoDB', 'Socket.IO'], colourLabel: '#6366f1' });
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    await Task.insertMany([
      { projectId: project._id, title: 'Design database schema', description: 'Create Mongoose models', status: 'done', priority: 'P2', assigneeId: user._id, createdAt: yesterday },
      { projectId: project._id, title: 'Implement real-time collaboration', description: 'Socket.IO sync', status: 'inprogress', priority: 'P0', assigneeId: user._id, dueDate: tomorrow }
    ]);
    res.json({ message: '✅ Database seeded successfully! You can now login with judge@demo.com and password123' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Socket.IO
const activeUsers = {};
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devcollab_secret_2024');
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join:project', ({ projectId, userId, userName, avatar }) => {
    socket.join(`project:${projectId}`);
    if (!activeUsers[projectId]) activeUsers[projectId] = {};
    activeUsers[projectId][socket.id] = { userId, userName, avatar };
    io.to(`project:${projectId}`).emit('presence:update', Object.values(activeUsers[projectId]));
  });

  socket.on('leave:project', ({ projectId }) => {
    socket.leave(`project:${projectId}`);
    if (activeUsers[projectId]) {
      delete activeUsers[projectId][socket.id];
      io.to(`project:${projectId}`).emit('presence:update', Object.values(activeUsers[projectId]));
    }
  });

  socket.on('cursor:move', (data) => {
    socket.to(`project:${data.projectId}`).emit('cursor:move', { ...data, socketId: socket.id, userName: socket.user?.name, avatar: socket.user?.avatar });
  });

  socket.on('task:moved', (data) => {
    socket.to(`project:${data.projectId}`).emit('task:moved', data);
  });

  socket.on('task:updated', (data) => {
    socket.to(`project:${data.projectId}`).emit('task:updated', data);
  });

  socket.on('task:created', (data) => {
    socket.to(`project:${data.projectId}`).emit('task:created', data);
  });

  socket.on('task:deleted', (data) => {
    socket.to(`project:${data.projectId}`).emit('task:deleted', data);
  });

  socket.on('task:viewing', ({ projectId, taskId, userId, userName }) => {
    socket.to(`project:${projectId}`).emit('task:viewing', { taskId, userId, userName });
  });

  socket.on('comment:typing', ({ projectId, taskId, userId, userName }) => {
    socket.to(`project:${projectId}`).emit('comment:typing', { taskId, userId, userName });
  });

  socket.on('notification:send', ({ userId, notification }) => {
    io.to(`user:${userId}`).emit('notification:new', notification);
  });

  socket.on('join:user', ({ userId }) => {
    socket.join(`user:${userId}`);
  });

  socket.on('disconnect', () => {
    for (const projectId in activeUsers) {
      if (activeUsers[projectId][socket.id]) {
        delete activeUsers[projectId][socket.id];
        io.to(`project:${projectId}`).emit('presence:update', Object.values(activeUsers[projectId]));
      }
    }
  });
});

app.set('io', io);

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/devcollab';
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(MONGO_URI)
    .then(() => {
      console.log('MongoDB connected');
      const PORT = process.env.PORT || 5000;
      server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => console.error('MongoDB error:', err));
}

module.exports = { app, server };
