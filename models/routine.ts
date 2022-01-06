import { model, Schema, Document } from 'mongoose';

export interface IRoutine extends Document {
    name: string,
    workouts: Array< { name: string, exercise_sequence: Array< { name: string, category: string, is_compound: boolean } > } >
}

const RoutineSchema = new Schema(
    {
        name: { type: String },
        workouts: [
            { name: { type: String, required: true }, exercise_sequence: [ { type: Schema.Types.ObjectId, ref: 'Exercise' } ] },
            { name: { type: String, required: true }, exercise_sequence: [ { type: Schema.Types.ObjectId, ref: 'Exercise' } ] },
            { name: { type: String, required: true }, exercise_sequence: [ { type: Schema.Types.ObjectId, ref: 'Exercise' } ] },
            { name: { type: String, required: true }, exercise_sequence: [ { type: Schema.Types.ObjectId, ref: 'Exercise' } ] }
        ],
    }
)
const Routine = model<IRoutine>('Routine', RoutineSchema);

export default Routine;