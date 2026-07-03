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

// Keep track of active rooms and their participants in-memory
const activeRooms = new Map<string, Map<string, {
  socketId: string;
  userId: string;
  username: string;
  avatarIdx: number;
  avatarUrl?: string;
  isMuted: boolean;
  isCamOff: boolean;
}>>();

// Socket.io Connection Handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoomId: string | null = null;

  // WebRTC Room Signaling & Participant Tracking
  socket.on('join-room', (roomId, participantInfo: {
    userId: string;
    username: string;
    avatarIdx: number;
    avatarUrl?: string;
    isMuted: boolean;
    isCamOff: boolean;
  }) => {
    socket.join(roomId);
    currentRoomId = roomId;

    if (!activeRooms.has(roomId)) {
      activeRooms.set(roomId, new Map());
    }
    const room = activeRooms.get(roomId)!;
    room.set(socket.id, {
      socketId: socket.id,
      ...participantInfo
    });

    console.log(`User ${participantInfo.username} joined room ${roomId}`);

    // Broadcast the updated participant list to everyone in the room
    io.to(roomId).emit('room-users', Array.from(room.values()));
  });

  // Update Media State (Mute/Camera)
  socket.on('update-media', (mediaState: { isMuted: boolean; isCamOff: boolean }) => {
    if (currentRoomId && activeRooms.has(currentRoomId)) {
      const room = activeRooms.get(currentRoomId)!;
      const participant = room.get(socket.id);
      if (participant) {
        participant.isMuted = mediaState.isMuted;
        participant.isCamOff = mediaState.isCamOff;
        io.to(currentRoomId).emit('room-users', Array.from(room.values()));
      }
    }
  });

  // Real-time Chat
  socket.on('send-chat-msg', (roomId, msg) => {
    io.to(roomId).emit('receive-chat-msg', msg);
  });

  // Real-time Collaborative Notes
  socket.on('update-notes', (roomId, notes) => {
    socket.to(roomId).emit('notes-updated', notes);
  });

  // Disconnect Handler
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (currentRoomId && activeRooms.has(currentRoomId)) {
      const room = activeRooms.get(currentRoomId)!;
      room.delete(socket.id);
      
      if (room.size === 0) {
        activeRooms.delete(currentRoomId);
      } else {
        io.to(currentRoomId).emit('room-users', Array.from(room.values()));
      }
    }
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
