/* eslint-disable @typescript-eslint/naming-convention */
import {type Types, model, Schema} from 'mongoose';
import {startOfDay, endOfDay} from 'date-fns';
import {type SetType, SetSchema} from './set';
import {User} from './user';

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

const createWorkout = async (user_id: string, sets: SetType[]) => {
	const newSet = sets[0];
	const currentTime = new Date();

	const userObject = await User.findOne({user_id});

	if (!userObject) {
		return;
	}

	const query = {createdAt: {
		$gt: startOfDay(new Date(currentTime)),
		$lt: endOfDay(new Date(currentTime)),
	}};

	const update = {
		user: userObject._id,
		$push: {sets: {...newSet}},
	};

	const workout = await Workout.findOneAndUpdate(
		query,
		update,
		{upsert: true, new: true, setDefaultsOnInsert: true},
	).lean();

	return workout;
};

export {getWorkouts, getWorkoutById, createWorkout};
