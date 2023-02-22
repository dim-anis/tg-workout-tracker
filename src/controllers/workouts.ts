import type {Request, Response} from 'express';
import Workout from '../models/workout.js';
import User from '../models/user.js';
import {startOfDay, endOfDay} from 'date-fns';
import {type SetType} from 'models/set.js';
import {ErrorResponse} from '../utils/errors.js';
import handleAsync from '../middleware/async.js';

export const getWorkouts = handleAsync(async (req: Request, res: Response) => {
	const limit: number = parseInt(req.body.limit as string, 10);

	const workouts = await Workout.find({}).sort({createdAt: -1}).limit(limit).exec();
	if (!workouts) {
		throw new ErrorResponse(404, 'Could\'nt find any workouts. Time to record some!');
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: workouts,
	});
});

export const getWorkoutById = handleAsync(async (req: Request, res: Response) => {
	const {id} = req.params;

	const workout = await Workout.findById(id);

	if (!workout) {
		throw new ErrorResponse(404, 'Couldn\t find the workout.');
	}

	res.status(200).json({
		response: 'successfull',
		message: '',
		data: workout,
	});
});

export const createWorkout = handleAsync(async (req: Request, res: Response): Promise<void> => {
	const user_id: string = req.body.user_id as string;
	const sets = req.body.sets as SetType[];
	const newSet = sets[0];

	const currentTime = new Date();

	const userObject = await User.findOne({user_id});

	if (!userObject) {
		throw new ErrorResponse(404, 'User not found');
	}

	const query = {createdAt: {
		$gt: startOfDay(new Date(currentTime)),
		$lt: endOfDay(new Date(currentTime)),
	}};

	const update = {
		user: userObject._id,
		$push: {sets: {...newSet}},
	};

	const options = {upsert: true, new: true, setDefaultsOnInsert: true};

	const workout = await Workout.findOneAndUpdate(query, update, options);

	if (!workout) {
		throw new ErrorResponse(500, 'Something went wrong. Try again.');
	}

	res.status(200).json({
		response: 'successfull',
		message: `Successfully added a set of ${newSet.exercise}`,
		data: workout,
	});
});
