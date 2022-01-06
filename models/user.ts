import { model, Schema, Document } from 'mongoose';

export interface IUser extends Document {
    name: {
        first: string,
        last: string
    },
    current_routine: object,
    last_workout: string
}

const UserSchema = new Schema<IUser>(
    {
        name: {
            first: { type: String },
            last: { type: String }
        },
        current_routine: { type: Schema.Types.ObjectId, ref: 'Routine'},
        last_workout: { type: String }
    }
);

const User = model<IUser>('User', UserSchema);

export default User;

