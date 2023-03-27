/* eslint-disable @typescript-eslint/naming-convention */
import {type Types, model, Schema} from 'mongoose';
import {startOfDay, endOfDay} from 'date-fns';
import {type SetType, SetSchema} from './set';
import {User} from './user';
import {averageRpe} from '../handlers/helpers/countSets';

export type WorkoutType = {
	user: Types.ObjectId;
	sets: SetType[];
	avg_rpe: number;
	durationInMinutes: number;
} & {updatedAt: Date; createdAt: Date};

const workoutOpts = {
	timestamps: true,
	collection: 'workouts',
};

const workoutSchema = new Schema(
	{
		user: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'User',
		},
		sets: {
			type: [SetSchema],
			required: true,
		},
		avg_rpe: {
			type: Number,
			default: 0,
			required: true,
		},
	},
	workoutOpts,
);

const Workout = model<WorkoutType>('Workout', workoutSchema);

const getWorkouts = async (limit: number) => Workout.find({}).sort({createdAt: -1}).limit(limit).lean().exec();

const getWorkoutById = async (id: number) => Workout.findById(id);

const createOrUpdateWorkout = async (user_id: string, set: SetType) => {
	const currentTime = new Date();

	const user = await User.findOne({user_id});

	if (!user) {
		throw new Error('User doesn not exist');
	}

	const query = {
		user: user._id,
		createdAt: {
			$gt: startOfDay(new Date(currentTime)),
			$lt: endOfDay(new Date(currentTime)),
		},
	};

	const update = {
		user: user._id,
		$push: {
			sets: set,
		},
	};

	const updatedSetsWorkout = await Workout.findOneAndUpdate(
		query,
		update,
		{upsert: true, new: true, setDefaultsOnInsert: true},
	).lean();

	const {_id} = updatedSetsWorkout;

	const updateAvgRpeWorkout = await Workout.findOneAndUpdate(
		_id,
		{
			$set: {
				avg_rpe: averageRpe(updatedSetsWorkout.sets),
			},
		},
		{
			new: true,
		},
	).lean();

	return updateAvgRpeWorkout;
};

export {getWorkouts, getWorkoutById, createOrUpdateWorkout};
