import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Task } from '../models/Task';

export const createTask = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database connection error' });
  }

  try {
    const task = new Task(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getTasks = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database connection error' });
  }

  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ message: 'Database connection error' });
  }

  try {
    const { id } = req.params;
    const updateData = req.body;
    const task = await Task.findByIdAndUpdate(id, updateData, { new: true });
    res.json(task);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
