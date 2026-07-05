import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    
    // Generate Access & Refresh tokens
    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecret_intellmeet_token_2026', { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || 'supersecret_intellmeet_refresh_token_2026', { expiresIn: '7d' });
    
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({ 
      token: accessToken, 
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid password' });

    // Generate Access & Refresh tokens
    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecret_intellmeet_token_2026', { expiresIn: '15m' });
    const refreshToken = jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET || 'supersecret_intellmeet_refresh_token_2026', { expiresIn: '7d' });
    
    user.refreshToken = refreshToken;
    await user.save();

    res.json({ 
      token: accessToken, 
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

    const decoded: any = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'supersecret_intellmeet_refresh_token_2026');
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'supersecret_intellmeet_token_2026', { expiresIn: '15m' });
    res.json({ token: accessToken });
  } catch (error: any) {
    res.status(401).json({ message: 'Invalid token' });
  }
};
