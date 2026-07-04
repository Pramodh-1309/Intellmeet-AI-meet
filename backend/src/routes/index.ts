import { Router } from 'express';
import authRoutes from './authRoutes';
import meetingRoutes from './meetingRoutes';
import taskRoutes from './taskRoutes';
import uploadRoutes from './uploadRoutes';
import aiRoutes from './aiRoutes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/meetings', meetingRoutes);
router.use('/tasks', taskRoutes);
router.use('/upload', uploadRoutes);
router.use('/ai', aiRoutes);

export default router;
