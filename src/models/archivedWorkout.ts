import { type Types, Schema, model } from 'mongoose';
import { type SetType, SetSchema } from './set.js';

export type ArchivedWorkoutType = {
  user: Types.ObjectId;
  sets: SetType[];
  avg_rpe: number;
  created: Date;
  updated: Date;
};

export const ArchivedWorkoutSchema = new Schema<ArchivedWorkoutType>({
  user: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  sets: {
    type: [SetSchema],
    required: true
  },
  avg_rpe: {
    type: Number,
    default: 0,
    required: true
  },
  created: {
    type: Date,
    required: true
  },
  updated: {
    type: Date,
    require: true
  }
});
