import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const UserSchema = new Schema(
    {
        name: { type: String },
        current_routine: { type: Array }
    }
);

export default mongoose.model('User', UserSchema);

