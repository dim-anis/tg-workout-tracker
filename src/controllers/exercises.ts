import type {Request, Response, NextFunction} from 'express';
import Exercise from '../models/exercise.js';
import handleAsync from '../utils/asyncHandler.js';

export const getAllExercises = handleAsync(async (req: Request, res: Response, next: NextFunction) => {
	const exercises = await Exercise.find({});
	if (!exercises) {
		return res.status(400).json({message: 'You havent\'t added any exercises yet'});
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
		return res.status(400).json({message: 'Couldn\'t find the exercise'});
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: exercise,
	});
});

export const findExercisesByCategory = handleAsync(async (req: Request, res: Response, category: string) => {
	const exercises = await Exercise.find({category}, 'name').exec();
	if (!exercises) {
		return res.status(400).json({message: `No exercise found in ${category}`});
	}

	return res.status(200).json({
		response: 'successfull',
		message: '',
		data: exercises,
	});
});
