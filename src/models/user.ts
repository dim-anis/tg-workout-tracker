/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema} from 'mongoose';
import {ExerciseSchema, type ExerciseType} from './exercise';

export type UserType = {
	name?: string;
	user_id: string;
	exercises: ExerciseType[];
	settings: {
		isMetric: boolean;
		splitLength: number;
	};
};

const UserSchema = new Schema(
	{
		name: {type: String},
		user_id: {type: String, required: true, unique: true},
		exercises: {type: [ExerciseSchema], required: true},
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

const getAllUserExercises = async (user_id: string) => {
	const user = await User.findOne({user_id}).lean();
	return user?.exercises;
};

const createUserExercise = async (user_id: string, name: string, category: string, is_compound: boolean) => {
	const userUpdated = await User.findOneAndUpdate(
		{user_id},
		{
			$push: {
				exercises: {name, category, is_compound},
			},
		},
		{
			new: true,
		},
	);

	return userUpdated;
};

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

export {User, findOrCreateUser, updateUser, getAllUserExercises, createUserExercise};
