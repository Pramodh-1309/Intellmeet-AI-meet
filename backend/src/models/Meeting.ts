import { Schema, model } from 'mongoose';

const meetingSchema = new Schema({
  title: { type: String, required: true },
  host: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },
  duration: { type: String, default: '0 mins' },
  participants: [{ type: String }],
  summary: { type: String, default: '' },
  actionItems: [{ type: String }],
  transcript: [{
    speaker: String,
    text: String,
    time: String
  }]
}, { timestamps: true });

export const Meeting = model('Meeting', meetingSchema);
