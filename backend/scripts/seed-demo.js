require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Workspace, Project, Task, WikiPage } = require('../models/index');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/devcollab');
  
  console.log('Clearing database...');
  await Promise.all([
    User.deleteMany({}),
    Workspace.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    WikiPage.deleteMany({})
  ]);

  console.log('Creating demo user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await User.create({
    name: 'Demo Judge',
    email: 'judge@demo.com',
    password: passwordHash
  });

  console.log('Creating workspace and project...');
  const workspace = await Workspace.create({
    name: 'Hackathon Workspace',
    ownerId: user._id,
    members: [{ userId: user._id, role: 'admin' }]
  });

  const project = await Project.create({
    workspaceId: workspace._id,
    name: 'DevCollab Demo App',
    description: 'A platform to help student developers collaborate in real-time.',
    techStack: ['React', 'Node.js', 'MongoDB', 'Socket.IO'],
    colourLabel: '#6366f1'
  });

  console.log('Pre-populating tasks...');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  await Task.insertMany([
    {
      projectId: project._id,
      title: 'Design database schema',
      description: 'Create Mongoose models for User, Workspace, Project, and Task.',
      status: 'done',
      priority: 'P2',
      assigneeId: user._id,
      createdAt: yesterday
    },
    {
      projectId: project._id,
      title: 'Implement real-time collaboration',
      description: 'Use Socket.IO to sync dragging and typing.',
      status: 'inprogress',
      priority: 'P0',
      assigneeId: user._id,
      dueDate: tomorrow
    },
    {
      projectId: project._id,
      title: 'Fix authentication bug',
      description: 'Users are getting 401 when trying to login via API.',
      status: 'todo',
      priority: 'P1',
      dueDate: yesterday // Overdue!
    },
    {
      projectId: project._id,
      title: 'Build UI for AI code reviewer',
      description: 'Needs to render structured json with apply fix button.',
      status: 'todo',
      priority: 'P1'
    },
    {
      projectId: project._id,
      title: 'Deploy to Vercel/Render',
      description: 'Setup CI/CD pipeline.',
      status: 'inreview',
      priority: 'P2',
      assigneeId: user._id
    }
  ]);

  console.log('Creating wiki pages...');
  await WikiPage.create([
    {
      projectId: project._id,
      title: 'Project Architecture',
      content: '# Architecture\n\nWe are using the MERN stack with Socket.IO for real-time features.'
    },
    {
      projectId: project._id,
      title: 'API Documentation',
      content: '# API Docs\n\n## Authentication\n`POST /auth/login`\n`POST /auth/register`'
    }
  ]);

  console.log('\\n✅ Demo Setup Complete! ✅\\n');
  console.log('Login Credentials:');
  console.log('Email: judge@demo.com');
  console.log('Password: password123\\n');
  
  process.exit(0);
}

seed().catch(console.error);
