import { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Member', 'Software Engineer', 'Student', 'Guest', 'User'], default: 'Member' },
  avatarUrl: { type: String, default: '' },
  refreshToken: { type: String, default: '' }
}, { timestamps: true });

export const User = model('User', userSchema);
