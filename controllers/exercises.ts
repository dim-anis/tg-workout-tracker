import type {Request, Response} from 'express';
import Exercise from '../models/exercise';
import mongoose from 'mongoose';

export const getAllExercises = async (req: Request, res: Response) => {
	try {
		const exercises = await Exercise.find({});
		if (!exercises) {
			return res.status(400).json({message: 'You havent\'t added any exercises yet'});
		}

		return res.json(exercises);
	} catch (err: unknown) {
		const error = err as Error | mongoose.Error;
		if (error instanceof mongoose.Error) {
			return res.status(400).json({error: `Mongoose error: ${error.message}`});
		}

		return res.status(400).json({error: `Native error: ${error.message}`});
	}
};

export const findExerciseByName = async (req: Request, res: Response, name?: string) => {
	try {
		const exercise = await Exercise.find({name});
		if (!exercise) {
			return res.status(400).json({message: `Couldn't find ${name ? name : 'any exercises'}`});
		}

		return exercise;
	} catch (err: unknown) {
		const error = err as Error | mongoose.Error;
		if (error instanceof mongoose.Error) {
			return res.status(400).json({error: `Mongoose error: ${error.message}`});
		}

		return res.status(400).json({error: `Native error: ${error.message}`});
	}
};

export const findExercisesByCategory = async (req: Request, res: Response, category: string) => {
	try {
		const exercises = await Exercise.find({category}, 'name').exec();
		if (!exercises) {
			return res.status(400).json({message: `No exercise found in ${category}`});
		}

		return exercises;
	} catch (err: unknown) {
		const error = err as Error | mongoose.Error;
		if (error instanceof mongoose.Error) {
			return res.status(400).json({error: `Mongoose error: ${error.message}`});
		}

		return res.status(400).json({error: `Native error: ${error.message}`});
	}
};
