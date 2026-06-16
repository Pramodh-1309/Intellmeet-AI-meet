import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Meeting } from '../models/Meeting';

export const createMeeting = async (req: AuthRequest, res: Response) => {
  try {
    const meeting = new Meeting({ ...req.body, host: req.user.id });
    await meeting.save();
    res.status(201).json(meeting);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMeetings = async (req: AuthRequest, res: Response) => {
  try {
    const meetings = await Meeting.find().populate('host', 'name');
    res.json(meetings);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
