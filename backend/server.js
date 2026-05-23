const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/activity', require('./routes/activity'));

// Socket.IO
const activeUsers = {};

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
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB error:', err));
