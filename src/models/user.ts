/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema} from 'mongoose';
import {WorkoutSchema, Workout, type WorkoutType} from './workout';
import {ExerciseSchema, type ExerciseType} from './exercise';
import {type SetType} from './set';
import isSameDay from 'date-fns/isSameDay';
import {averageRpe} from '../handlers/helpers/countSets';

export type UserType = {
	user_id: string;
	exercises: ExerciseType[];
	recentWorkouts: WorkoutType[];
	settings: {
		isMetric: boolean;
		splitLength: number;
	};
};

export const UserSchema = new Schema<UserType>(
	{
		user_id: {type: String, required: true, unique: true},
		exercises: {type: [ExerciseSchema], required: true},
		recentWorkouts: {type: [WorkoutSchema], required: true},
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

UserSchema.pre('save', next => {
	console.log('pre middleware running on save');
	next();
});

const User = model<UserType>('User', UserSchema);

const createOrUpdateUserWorkout = async (user_id: string, set: SetType) => {
	const user = await User.findOne({user_id});

	if (!user) {
		throw new Error('User does not exist');
	}

	const today = new Date();
	const existingWorkout = user.recentWorkouts.find(workout => isSameDay(workout.createdAt, today));

	if (!existingWorkout) {
		const newWorkout = new Workout({
			sets: set,
			avg_rpe: set.rpe,
		});

		user.recentWorkouts.unshift(newWorkout);
		const updatedUser = (await user.save()).toObject();
		return updatedUser.recentWorkouts[0];
	}

	const newAvgRpe = averageRpe(user.recentWorkouts[0].sets.concat(set));
	user.recentWorkouts[0].sets.push(set);
	user.recentWorkouts[0].avg_rpe = newAvgRpe;

	const updatedUser = (await user.save()).toObject();
	return updatedUser.recentWorkouts[0];
};

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

export {
	User,
	createOrUpdateUserWorkout,
	findOrCreateUser,
	updateUserSettings,
	getAllUserExercises,
	deleteUserExercise,
	createUserExercise,
	updateUserExercise,
};
