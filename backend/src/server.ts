import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.io for Real-time Video WebRTC Signaling & Chat
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP'
});
app.use('/api', limiter);

// API Routes
app.use('/api', apiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date() });
});

app.use(errorHandler);

// Socket.io Connection Handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // WebRTC Room Signaling
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', userId);
    console.log(`User ${userId} joined room ${roomId}`);

    socket.on('disconnect', () => {
      socket.to(roomId).emit('user-disconnected', userId);
      console.log(`User ${userId} left room ${roomId}`);
    });
  });

  // Real-time Chat
  socket.on('send-chat-msg', (roomId, msg) => {
    io.to(roomId).emit('receive-chat-msg', msg);
  });

  // Real-time Collaborative Notes
  socket.on('update-notes', (roomId, notes) => {
    socket.to(roomId).emit('notes-updated', notes);
  });
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/intellmeet';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`Intellmeet server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database connection error:', err);
    console.log('Falling back to local in-memory execution mode (Dev only)');
    server.listen(PORT, () => {
      console.log(`Intellmeet server running in fallback mode on port ${PORT}`);
    });
  });
