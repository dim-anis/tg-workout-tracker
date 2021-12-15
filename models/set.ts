import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const SetSchema = new Schema(
    {
        trainee: { type: Schema.Types.ObjectId, ref: 'User', required: true},
        date: { type: Date, default: Date.now },
        exercise: { type: Schema.Types.ObjectId, ref: 'Exercise', required: true},
        repetitions: { type: Number },
        rpe: { type: Number, required: true },
        notes: { type: String }
    }
);

export default mongoose.model('Set', SetSchema);