/* eslint-disable @typescript-eslint/naming-convention */
import mongoose from 'mongoose';
import {WorkoutSchema, Workout, type WorkoutType} from './workout';
import {ExerciseSchema, type ExerciseType} from './exercise';
import {type SetType} from './set';
import isSameDay from 'date-fns/isSameDay';
import {getAverageRPE} from '../handlers/helpers/workoutStats';
import {ArchivedWorkoutSchema, type ArchivedWorkoutType} from './archivedWorkout';

export type UserType = {
	_id: mongoose.Types.ObjectId;
	user_id: number;
	exercises: ExerciseType[];
	recentWorkouts: WorkoutType[];
	settings: {
		isMetric: boolean;
		splitLength: number;
		mesocycleLength: number;
	};
};

export const UserSchema = new mongoose.Schema<UserType>(
	{
		user_id: {type: Number, required: true, unique: true},
		exercises: {type: [ExerciseSchema], required: true},
		recentWorkouts: {type: [WorkoutSchema], required: true},
		settings: {
			isMetric: {type: Boolean, default: true},
			splitLength: {type: Number, default: 3},
			mesocycleLength: {type: Number, default: 5},
		},
	},
	{
		collection: 'user-data',
		timestamps: true,
	},
);

UserSchema.pre<UserType>('save', async function (next) {
	if (this.recentWorkouts.length < 20) {
		next();
		return;
	}

	const workoutToArchive = this.recentWorkouts.pop();

	if (!workoutToArchive) {
		next();
		return;
	}

	const modelName = `ArchivedWorkouts_${this._id.toString()}`;
	if (!mongoose.models[modelName]) {
		mongoose.model(modelName, ArchivedWorkoutSchema);
	}

	const ArchivedWorkout = mongoose.model<ArchivedWorkoutType>(modelName);
	const archivedWorkout = new ArchivedWorkout({
		user: this._id,
		sets: workoutToArchive.sets,
		avg_rpe: workoutToArchive.avg_rpe,
		created: workoutToArchive.createdAt,
		updated: workoutToArchive.updatedAt,
	});

	await archivedWorkout.save();
});

const User = mongoose.model<UserType>('User', UserSchema);

const createOrUpdateUserWorkout = async (user_id: number, set: SetType, isDeload: boolean) => {
	const user = await User.findOne({ user_id });

  if (!user) {
    throw new Error('User does not exist');
  }

  const today = new Date();
  let mostRecentWorkout = user.recentWorkouts[0];

  if (!mostRecentWorkout || !isSameDay(mostRecentWorkout.createdAt, today)) {
    mostRecentWorkout = new Workout({
      sets: [set],
      avg_rpe: set.rpe,
			isDeload
    });

    user.recentWorkouts.unshift(mostRecentWorkout);
  } else {
    const newAvgRpe = getAverageRPE(mostRecentWorkout.sets.concat(set));
    mostRecentWorkout.sets.push(set);
    mostRecentWorkout.avg_rpe = newAvgRpe;
  }

  const updatedUser = await user.save();
	const plainUserObject = updatedUser.toObject();
	
  return plainUserObject.recentWorkouts[0];
};

const getAllUserExercises = async (user_id: number) => {
	const user = await User.findOne({user_id}).lean();
	return user?.exercises;
};

const createUserExercise = async (user_id: number, exercise: ExerciseType | ExerciseType[]) => {
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

const updateUserExercise = async (user_id: number, currName: string, editedExercise: ExerciseType) => {
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

const deleteUserExercise = async (user_id: number, exerciseName: string) => {
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

const updateUserSettings = async (user_id: number, splitLength: number, mesocycleLength: number, isMetric: boolean) => {
	const userUpdated = await User.findOneAndUpdate(
		{user_id},
		{
			$set: {
				settings: {
					splitLength,
					mesocycleLength,
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
