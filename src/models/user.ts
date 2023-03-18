/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema} from 'mongoose';
import {ExerciseSchema, type ExerciseType} from './exercise';

export type UserType = {
	user_id: string;
	exercises: ExerciseType[];
	settings: {
		isMetric: boolean;
		splitLength: number;
	};
};

const UserSchema = new Schema(
	{
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

const createUserExercise = async (user_id: string, exercise: ExerciseType | ExerciseType[]) => {
	const userUpdated = await User.findOneAndUpdate(
		{user_id},
		{
			$push: {
				exercises: exercise,
			},
		},
		{
			new: true,
			runValidators: true,
		},
	);

	return userUpdated;
};

const updateUserExercise = async (user_id: string, currName: string, editedExercise: ExerciseType) => {
	const userUpdated = await User.findOneAndUpdate(
		{user_id, 'exercises.name': currName},
		{
			$set: {
				'exercises.$.name': editedExercise.name,
				'exercises.$.category': editedExercise.category,
				'exercises.$.is_compound': editedExercise.is_compound,
			},
		},
		{
			new: true,
			runValidators: true,
		},
	);

	return userUpdated;
};

const deleteUserExercise = async (user_id: string, exerciseName: string) => {
	const userUpdated = await User.findOneAndUpdate(
		{user_id},
		{
			$pull: {
				exercises: {
					name: exerciseName,
				},
			},
		},
		{
			new: true,
		},
	);

	return userUpdated;
};

const updateUserSettings = async (user_id: string, splitLength: number, isMetric: boolean) => {
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

export {User, findOrCreateUser, updateUserSettings, getAllUserExercises, deleteUserExercise, createUserExercise, updateUserExercise};
