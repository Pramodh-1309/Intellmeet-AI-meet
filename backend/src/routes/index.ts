import { Router } from 'express';
import authRoutes from './authRoutes';
import meetingRoutes from './meetingRoutes';
import taskRoutes from './taskRoutes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/meetings', meetingRoutes);
router.use('/tasks', taskRoutes);

export default router;
