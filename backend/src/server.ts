import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
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

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

import nodemailer from 'nodemailer';

app.post('/api/send-otp', async (req: any, res: any) => {
  try {
    const { toEmail, otpCode, smtpSettings } = req.body;
    
    if (!toEmail || !otpCode) {
      return res.status(400).json({ success: false, message: 'Missing parameters (toEmail, otpCode)' });
    }

    let transporter;
    if (smtpSettings && smtpSettings.host && smtpSettings.user && smtpSettings.pass) {
      transporter = nodemailer.createTransport({
        host: smtpSettings.host,
        port: parseInt(smtpSettings.port) || 587,
        secure: smtpSettings.secure === true || smtpSettings.port === '465' || smtpSettings.port === 465,
        auth: {
          user: smtpSettings.user,
          pass: smtpSettings.pass
        }
      });
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Ethereal Mock Mailbox
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    }

    const mailOptions = {
      from: smtpSettings?.from || process.env.SMTP_FROM || '"IntellMeet Workspace" <no-reply@intellmeet.com>',
      to: toEmail,
      subject: '🔐 Your IntellMeet Verification OTP Code',
      text: `Hello,\n\nYour 6-digit confirmation code is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nThe IntellMeet Team`,
      html: `
        <div style="font-family: 'Poppins', Helvetica, Arial, sans-serif; padding: 20px; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #FAF8F5;">
          <h2 style="color: #674A40; border-bottom: 2px solid #50A3A4; padding-bottom: 10px;">IntellMeet Verification</h2>
          <p style="font-size: 16px; color: #4a4a4a;">Hello,</p>
          <p style="font-size: 16px; color: #4a4a4a;">Your 6-digit verification code is:</p>
          <div style="background-color: #ffffff; border: 2px dashed #50A3A4; border-radius: 8px; padding: 15px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #674A40; letter-spacing: 0.25em;">${otpCode}</span>
          </div>
          <p style="font-size: 14px; color: #7a7a7a;">This verification code will expire in 10 minutes. Please do not share this code with anyone.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #a0aec0; text-align: center;">Sent by IntellMeet Workspace Collaboration System</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info);

    res.json({
      success: true,
      message: 'OTP sent successfully!',
      messageId: info.messageId,
      previewUrl: previewUrl || undefined
    });
  } catch (error: any) {
    console.error('SMTP Email Error:', error);
    res.status(500).json({ success: false, message: 'SMTP Email Transport failed: ' + error.message });
  }
});

app.use(errorHandler);

// Redis client configuration (mock if Redis is offline/not configured)
let redisClient: any = null;
if (process.env.REDIS_URL) {
  try {
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on('connect', () => console.log('Redis connected successfully'));
    redisClient.on('error', (err: any) => console.warn('Redis connection error:', err));
  } catch (err) {
    console.warn('Redis connection helper initialized but server not connected:', err);
  }
}

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
    const participantData = {
      socketId: socket.id,
      ...participantInfo
    };
    room.set(socket.id, participantData);

    if (redisClient) {
      const redisKey = `room:${roomId}:users`;
      redisClient.hset(redisKey, socket.id, JSON.stringify(participantData))
        .catch((err: any) => console.warn("Redis hset failed:", err));
      redisClient.expire(redisKey, 86400).catch(() => {});
    }

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
        
        if (redisClient) {
          const redisKey = `room:${currentRoomId}:users`;
          redisClient.hset(redisKey, socket.id, JSON.stringify(participant))
            .catch((err: any) => console.warn("Redis update media failed:", err));
        }

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

  // Waiting Room Handlers
  socket.on('request-to-join', (roomId, userInfo) => {
    socket.to(roomId).emit('join-request-received', {
      socketId: socket.id,
      ...userInfo
    });
  });

  socket.on('admit-user', (targetSocketId) => {
    io.to(targetSocketId).emit('join-admitted');
  });

  socket.on('decline-user', (targetSocketId) => {
    io.to(targetSocketId).emit('join-declined');
  });

  // WebRTC Signaling relays
  socket.on('webrtc-offer', (payload: { toSocketId: string; offer: any }) => {
    io.to(payload.toSocketId).emit('webrtc-offer', {
      fromSocketId: socket.id,
      offer: payload.offer
    });
  });

  socket.on('webrtc-answer', (payload: { toSocketId: string; answer: any }) => {
    io.to(payload.toSocketId).emit('webrtc-answer', {
      fromSocketId: socket.id,
      answer: payload.answer
    });
  });

  socket.on('webrtc-ice-candidate', (payload: { toSocketId: string; candidate: any }) => {
    io.to(payload.toSocketId).emit('webrtc-ice-candidate', {
      fromSocketId: socket.id,
      candidate: payload.candidate
    });
  });

  // Disconnect Handler
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    if (currentRoomId) {
      if (redisClient) {
        redisClient.hdel(`room:${currentRoomId}:users`, socket.id)
          .catch((err: any) => console.warn("Redis disconnect hdel failed:", err));
      }

      if (activeRooms.has(currentRoomId)) {
        const room = activeRooms.get(currentRoomId)!;
        room.delete(socket.id);
        
        if (room.size === 0) {
          activeRooms.delete(currentRoomId);
        } else {
          io.to(currentRoomId).emit('room-users', Array.from(room.values()));
        }
      }
    }
  });
});

// Database Connection
const PORT = process.env.PORT || 5000;
let MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/intellmeet';

// Auto-encode special characters (like '@') in password credentials if found raw
if (MONGO_URI.startsWith('mongodb+srv://') || MONGO_URI.startsWith('mongodb://')) {
  try {
    const prefix = MONGO_URI.startsWith('mongodb+srv://') ? 'mongodb+srv://' : 'mongodb://';
    const remaining = MONGO_URI.substring(prefix.length);
    const lastAtIdx = remaining.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const credentials = remaining.substring(0, lastAtIdx);
      const hostAndParams = remaining.substring(lastAtIdx + 1);
      const colonIdx = credentials.indexOf(':');
      if (colonIdx !== -1) {
        const username = credentials.substring(0, colonIdx);
        const password = credentials.substring(colonIdx + 1);
        if (password.includes('@') || password.includes(':') || password.includes('/') || password.includes('+')) {
          const encodedPassword = encodeURIComponent(decodeURIComponent(password));
          MONGO_URI = `${prefix}${username}:${encodedPassword}@${hostAndParams}`;
          console.log('MongoDB connection string credentials auto-encoded successfully.');
        }
      }
    }
  } catch (parseErr) {
    console.warn('Failed to auto-parse and encode MongoDB URI:', parseErr);
  }
}

// Disable Mongoose command buffering so queries fail instantly if connection is down
mongoose.set('bufferCommands', false);

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
