const request = require('supertest');
const { app, server } = require('../server');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  server.close();
});

describe('API Tests', () => {
  let token;
  let userId;

  test('POST /api/auth/register', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'password123' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', 'test@example.com');
  });

  test('POST /api/auth/login', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
    userId = res.body.user._id;
  });

  test('GET /api/auth/me', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('email', 'test@example.com');
  });
});
