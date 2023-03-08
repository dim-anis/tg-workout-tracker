/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema} from 'mongoose';

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

const User = model<UserType>('User', UserSchema);

const updateUser = async (user_id: string, splitLength: number, isMetric: boolean) => {
	const userUpdated = await User.findOneAndUpdate(
		{user_id},
		{
			$set: {
				settings: {
					splitLength,
					isMetric,
				},
			},
		},
		{
			new: true,
		},
	);

	return userUpdated;
};

const findOrCreateUser = async (user_id: number) => User.findOneAndUpdate(
	{user_id},
	{},
	{upsert: true, new: true},
);

export {User, findOrCreateUser, updateUser};
