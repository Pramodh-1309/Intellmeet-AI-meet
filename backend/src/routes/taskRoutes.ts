import { Router } from 'express';
import { createTask, getTasks, updateTask } from '../controllers/taskController';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();
router.post('/', authMiddleware, requireRole(['Admin', 'Software Engineer']), createTask);
router.get('/', getTasks);
router.put('/:id', authMiddleware, requireRole(['Admin', 'Software Engineer']), updateTask);

export default router;
