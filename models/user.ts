import mongoose, { Types } from 'mongoose';
const Schema = mongoose.Schema;

const UserSchema = new Schema(
    {
        name: {
            first_name: { type: String },
            last_name: { type: String }
        },
        current_routine: { type: Schema.Types.ObjectId, ref: 'Routine'}
    }
);

export default mongoose.model('User', UserSchema);

