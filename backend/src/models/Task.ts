import { Schema, model } from 'mongoose';

const taskSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'done'], default: 'todo' },
  assignee: { type: String, default: 'Unassigned' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' }
}, { timestamps: true });

export const Task = model('Task', taskSchema);
