import { Router } from 'express';
import { createMeeting, getMeetings } from '../controllers/meetingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.post('/', createMeeting);
router.get('/', getMeetings);

export default router;
