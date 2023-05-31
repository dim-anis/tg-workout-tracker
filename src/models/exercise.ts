import { model, Schema } from 'mongoose';

export type PBRecord = {
  weight: number;
  date: Date;
};

export type ExerciseType = {
  name: string;
  category: string;
  is_compound: boolean;
  personalBests?: Map<string, { weight: number, date: Date }>;
};

export const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  is_compound: { type: Boolean, required: true },
  personalBests: {
    type: Map,
    of: {
      weight: Number,
      date: Date
    },
    default: new Map()
  }
});

export default model<ExerciseType>('Exercise', ExerciseSchema);
