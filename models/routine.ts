import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const RoutineSchema = new Schema(
    {
        name: { type: String },
        exercise_split: {
            upper_A: [ Schema.Types.ObjectId ],
            lower_A: [ Schema.Types.ObjectId ],
            upper_B: [ Schema.Types.ObjectId ],
            lower_B: [ Schema.Types.ObjectId ]
        },
    }
)
export default mongoose.model('Routine', RoutineSchema);