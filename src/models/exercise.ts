import { model, Schema } from 'mongoose';

export type PBRecord = {
  weight: number;
  date: Date;
};

export type PBType = Map<string, { weight: number, date: Date, lastPB?: { weight: number, date: Date } }>;

export type ExerciseType = {
  name: string;
  category: string;
  is_compound: boolean;
  personalBests?: PBType;
};

export const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  is_compound: { type: Boolean, required: true },
  personalBests: {
    type: Map,
    of: {
      weight: Number,
      date: Date,
      lastPB: {
        weight: Number,
        date: Date
      }
    },
    default: new Map()
  }
});

export default model<ExerciseType>('Exercise', ExerciseSchema);
