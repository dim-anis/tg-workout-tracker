import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const ExerciseSchema = new Schema(
    {
        name: { type: String },
        category: { type: String },
        is_compound: { type: Boolean }
    }
);

export default mongoose.model('Exercise', ExerciseSchema);