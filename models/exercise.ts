import { model, Schema } from 'mongoose';

export interface IExercise {
    name: string;
    category: string;
    is_compound: boolean;
}

const ExerciseSchema = new Schema<IExercise>(
    {
        name: { type: String },
        category: { type: String },
        is_compound: { type: Boolean, default: false }
    }
);


export default model<IExercise>('Exercise', ExerciseSchema);
