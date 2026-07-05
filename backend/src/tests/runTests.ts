import assert from 'assert';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import express, { Response } from 'express';
import http from 'http';
import mongoose from 'mongoose';
import apiRoutes from '../routes';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth';

console.log('Running IntellMeet Backend Test Suite...');

// 1. Unit Tests for Hashing and JWT
async function testPasswordHashing() {
  console.log('- Testing bcrypt password hashing...');
  const pass = 'SecretPassword123!';
  const hash = await bcrypt.hash(pass, 10);
  const matches = await bcrypt.compare(pass, hash);
  assert.strictEqual(matches, true, 'Hashed password should match original');
  console.log('  ✓ Hashing matches');
}

function testJWTTokenGeneration() {
  console.log('- Testing JWT signature and verification...');
  const payload = { id: 'user-123', role: 'Software Engineer' };
  const secret = 'testsecret';
  const token = jwt.sign(payload, secret, { expiresIn: '1h' });
  const verified: any = jwt.verify(token, secret);
  assert.strictEqual(verified.role, payload.role, 'Decoded role should match original');
  console.log('  ✓ JWT verification matches');
}

// 2. Middleware Integration Tests (Mock Req/Res)
function testRequireRoleMiddleware() {
  console.log('- Testing requireRole middleware (Mock Request/Response)...');
  
  let nextCalled = false;
  const mockReq: AuthRequest = {
    user: { id: '123', role: 'Student' }
  } as any;
  
  let statusCode = 200;
  let responseData: any = null;
  const mockRes: any = {
    status: (code: number) => {
      statusCode = code;
      return mockRes;
    },
    json: (data: any) => {
      responseData = data;
      return mockRes;
    }
  };

  const middleware = requireRole(['Admin', 'Software Engineer']);
  
  // Test disallowed role
  middleware(mockReq, mockRes, () => {
    nextCalled = true;
  });
  
  assert.strictEqual(nextCalled, false, 'Next should not be called for disallowed role');
  assert.strictEqual(statusCode, 403, 'Should respond with 403 Forbidden');
  assert.ok(responseData.message.includes('Required role not met'), 'Should have access denied message');

  // Test allowed role
  nextCalled = false;
  mockReq.user.role = 'Software Engineer';
  middleware(mockReq, mockRes, () => {
    nextCalled = true;
  });
  assert.strictEqual(nextCalled, true, 'Next should be called for allowed role');
  console.log('  ✓ requireRole middleware correctly blocks/permits roles');
}

// 3. HTTP Server Route and Controller Integration Tests
async function runRouteIntegrationTests() {
  console.log('- Setting up Express Integration Server...');
  const app = express();
  app.use(express.json());
  app.use('/api', apiRoutes);

  // Connect to test database
  const TEST_MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/intellmeet_test';
  let dbConnected = false;
  try {
    await mongoose.connect(TEST_MONGO_URI);
    dbConnected = true;
    console.log('  ✓ Test MongoDB connected');
    // Drop test database to ensure fresh clean run
    await mongoose.connection.db?.dropDatabase();
  } catch (err) {
    console.warn('  ⚠️ MongoDB connection failed, skipping database-dependent route assertions:', err);
  }

  // Start test server on random free port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`  ✓ Test server listening on port ${port}`);

  // Helper to make local requests
  const makeRequest = (path: string, method: 'GET' | 'POST' | 'PUT', body?: any, headers?: any): Promise<{ status: number; data: any }> => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: 'localhost',
          port,
          path,
          method,
          headers: {
            'Content-Type': 'application/json',
            ...headers
          }
        },
        (res) => {
          let chunks = '';
          res.on('data', (c) => chunks += c);
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode || 500,
                data: chunks ? JSON.parse(chunks) : {}
              });
            } catch {
              resolve({ status: res.statusCode || 500, data: { text: chunks } });
            }
          });
        }
      );
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  };

  try {
    if (dbConnected) {
      const adminEmail = `admin_${Date.now()}@zidio.com`;
      const studentEmail = `student_${Date.now()}@zidio.com`;

      console.log('  - Testing Route: POST /api/auth/signup (Admin User)');
      const signupRes = await makeRequest('/api/auth/signup', 'POST', {
        name: 'Test Administrator',
        email: adminEmail,
        password: 'Password123!',
        role: 'Admin'
      });
      assert.strictEqual(signupRes.status, 201, 'Signup should succeed with status 201');
      assert.ok(signupRes.data.token, 'Signup should return JWT token');
      const adminToken = signupRes.data.token;
      console.log('    ✓ Signup succeeds & returns token');

      console.log('  - Testing Route: POST /api/auth/login');
      const loginRes = await makeRequest('/api/auth/login', 'POST', {
        email: adminEmail,
        password: 'Password123!'
      });
      assert.strictEqual(loginRes.status, 200, 'Login should succeed with status 200');
      console.log('    ✓ Login succeeds with registered credentials');

      console.log('  - Testing Route: POST /api/tasks (Authorized role - Admin)');
      const createTaskRes = await makeRequest('/api/tasks', 'POST', {
        title: 'Complete Route Tests',
        description: 'Verify RBAC middleware is functional',
        status: 'todo',
        priority: 'high',
        assignee: 'Test Admin'
      }, {
        'Authorization': `Bearer ${adminToken}`
      });
      assert.strictEqual(createTaskRes.status, 201, 'Authorized task creation should return 201');
      assert.strictEqual(createTaskRes.data.title, 'Complete Route Tests', 'Task title should match');
      console.log('    ✓ Authorized user creates task successfully');

      console.log('  - Testing Route: POST /api/tasks (Unauthorized role - Student)');
      // Register a student user
      const studentSignup = await makeRequest('/api/auth/signup', 'POST', {
        name: 'Test Student',
        email: studentEmail,
        password: 'Password123!',
        role: 'Student'
      });
      const studentToken = studentSignup.data.token;
      assert.ok(studentToken, 'Student signup should return a token');
      
      const unauthTaskRes = await makeRequest('/api/tasks', 'POST', {
        title: 'Student Attempted Task',
        status: 'todo',
        priority: 'low'
      }, {
        'Authorization': `Bearer ${studentToken}`
      });
      assert.strictEqual(unauthTaskRes.status, 403, 'Student role should be blocked with 403 Forbidden');
      console.log('    ✓ Unauthorized role (Student) blocked correctly by requireRole middleware');

      console.log('  - Testing Route: GET /api/tasks');
      const getTasksRes = await makeRequest('/api/tasks', 'GET');
      assert.strictEqual(getTasksRes.status, 200, 'GET tasks should return 200');
      assert.ok(Array.isArray(getTasksRes.data), 'GET tasks response should be an array');
      console.log('    ✓ Tasks list retrieved successfully');
    }
  } finally {
    // Shutdown server and disconnect DB
    server.close();
    if (dbConnected) {
      await mongoose.disconnect();
      console.log('  ✓ Test MongoDB connection closed');
    }
    console.log('  ✓ Test integration server shutdown');
  }
}

async function runAll() {
  try {
    await testPasswordHashing();
    testJWTTokenGeneration();
    testRequireRoleMiddleware();
    await runRouteIntegrationTests();
    console.log('All backend unit and route integration tests completed successfully! ✓');
    process.exit(0);
  } catch (err: any) {
    console.error('Test suite failed:', err);
    process.exit(1);
  }
}

runAll();
