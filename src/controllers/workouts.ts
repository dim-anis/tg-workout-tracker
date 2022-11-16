import type {Request, Response, NextFunction} from 'express';
import Workout from '../models/workouts.js';
import type {WorkoutType} from '../models/workouts.js';
import User from '../models/user.js';
import {startOfDay, endOfDay} from 'date-fns';

import handleAsync from '../utils/asyncHandler.js';
import {BaseError} from '../utils/errors.js';
import type {UpdateWorkoutResponse} from '../config/api.js';

export const getAllWorkouts = handleAsync(async (req: Request, res: Response, next: NextFunction) => {
	const workouts = await Workout.find({}).sort({createdAt: -1}).exec();
	if (!workouts) {
		throw new BaseError(404, 'Could\'nt find any workouts. Time to record some!');
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: workouts,
	});
});

export const getWorkoutById = handleAsync(async (req: Request, res: Response, next: NextFunction) => {
	const {id} = req.params;
	const workout = await Workout.findById(id);

	if (!workout) {
		throw new BaseError(404, 'Couldn\t find the workout.');
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: workout,
	});
});

export const createWorkout = handleAsync(async (req: Request<Record<string, unknown>, Record<string, unknown>, WorkoutType>, res: Response<Record<string, unknown>, UpdateWorkoutResponse>, next: NextFunction) => {
	const {user, sets} = req.body;
	const newSet = sets[0];

	const currentTime = new Date();

	const userObject = await User.findOne({name: user}).select('name email').exec();

	if (!userObject) {
		throw new BaseError(404, 'User not found');
	}

	const query = {createdAt: {
		$gt: startOfDay(new Date(currentTime)),
		$lt: endOfDay(new Date(currentTime)),
	}};

	const update = {
		user: userObject._id,
		$push: {sets: {...newSet}},
	};

	const options = {upsert: true, returnDocument: 'after', setDefaultsOnInsert: true};

	const workout = await Workout.findOneAndUpdate(query, update, options);

	if (!workout) {
		throw new BaseError(500, 'Something went wrong. Try again.');
	}

	return res.status(200).json({
		response: 'successfull',
		message: `Successfully added a set of ${newSet.exercise}`,
		data: workout,
	});
});
