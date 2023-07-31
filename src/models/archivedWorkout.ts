import { type Types, Schema, model } from 'mongoose';
import { type SetType, SetSchema } from './set.js';

export type ArchivedWorkoutType = {
  user: Types.ObjectId;
  sets: SetType[];
  avg_rpe: number;
  created: Date;
  updated: Date;
  isDeload: boolean;
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
    required: true
  },
  isDeload: {
    type: Boolean,
    required: true
  }
});

export async function getArchivedWorkouts(user_id: string, pageNumber: number): Promise<ArchivedWorkoutType[]> {
  const ITEMS_PER_PAGE = 19;

  const collectionName = `archivedworkouts_${user_id}`;
  const ArchivedWorkout = model<ArchivedWorkoutType>(collectionName, ArchivedWorkoutSchema);
  const skipWorkouts = (pageNumber - 1) * ITEMS_PER_PAGE;

  const workouts = await ArchivedWorkout
    .find({})
    .sort({created: 'desc'})
    .skip(skipWorkouts)
    .limit(ITEMS_PER_PAGE)
    .lean();

  if (!workouts) {
    throw new Error("Error fetching workouts from DB");
  }

  return workouts;
}
