import { model, Schema } from 'mongoose';
export type OldPersonalBest = { 
  weight: number;
  repetitions: number;
  date: Date;
}
export type PersonalBest = {
  weight: number;
  repetitions: number;
  date: Date;
  oldPb?: OldPersonalBest
};

const OldPBSchema = new Schema<OldPersonalBest>({
  weight: { type: Number, required: true },
  repetitions: { type: Number, required: true },
  date: { type: Date, default: () => new Date(), required: true },
})

const PBSchema = new Schema<PersonalBest>({
  weight: { type: Number, required: true },
  repetitions: { type: Number, required: true },
  date: { type: Date, default: () => new Date(), required: true },
  oldPb: { type: OldPBSchema }
})

export type ExerciseType = {
  name: string;
  category: string;
  is_compound: boolean;
  personalBests?: PersonalBest[];
};

export const ExerciseSchema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  is_compound: { type: Boolean, required: true },
  personalBests: { type: [PBSchema] }
});

export default model<ExerciseType>('Exercise', ExerciseSchema);
