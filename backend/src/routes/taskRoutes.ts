import { Router } from 'express';
import { createTask, getTasks, updateTaskStatus } from '../controllers/taskController';

const router = Router();
router.post('/', createTask);
router.get('/', getTasks);
router.patch('/:id/status', updateTaskStatus);

export default router;
