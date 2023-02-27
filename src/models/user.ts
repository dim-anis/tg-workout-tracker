/* eslint-disable @typescript-eslint/naming-convention */

import mongoose, {model} from 'mongoose';
const {Schema} = mongoose;

export type UserType = {
	name?: string;
	user_id: string;
	settings: {
		isMetric: boolean;
		splitLength: number;
	};
};

const UserSchema = new Schema(
	{
		name: {type: String},
		user_id: {type: String, required: true, unique: true},
		settings: {
			isMetric: {type: Boolean, default: true},
			splitLength: {type: Number, default: 3},
		},
	},
	{
		collection: 'user-data',
		timestamps: true,
	},
);

export default model<UserType>('User', UserSchema);
