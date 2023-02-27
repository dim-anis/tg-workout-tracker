import type {Request, Response, NextFunction} from 'express';
import Exercise from '../models/exercise.js';
import handleAsync from '../middleware/async.js';
import {ErrorResponse} from '../utils/errors.js';

export const getAllExercises = handleAsync(async (req: Request, res: Response, next: NextFunction) => {
	const exercises = await Exercise.find({});
	if (!exercises) {
		next(new ErrorResponse(400, 'You havent\'t added any exercises yet'));
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: exercises,
	});
});

export const findExerciseByName = handleAsync(async (req: Request, res: Response, next: NextFunction) => {
	const {name} = req.query;
	const exercise = await Exercise.find({name});
	if (!exercise) {
		next(new ErrorResponse(400, 'Couldn\'t find this exercise'));
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: exercise,
	});
});

export const findExercisesByCategory = handleAsync(async (req: Request, res: Response, next: NextFunction, category: string) => {
	const exercises = await Exercise.find({category}, 'name').exec();
	if (!exercises) {
		next(new ErrorResponse(400, `No exercise found in ${category}`));
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: exercises,
	});
});

export const createExercise = handleAsync(async (req: Request, res: Response) => {
	const name: string = req.body.name as string;
	const category = req.body.category as string;
	const is_compound = req.body.is_compound as boolean;

	const exercise = new Exercise({name, category, is_compound});
	await exercise.save();

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: exercise,
	});
});
