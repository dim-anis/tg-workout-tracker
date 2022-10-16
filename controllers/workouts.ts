import type {Request, Response} from 'express';
import type {IWorkout} from '../models/workouts';
import Workout from '../models/workouts';
import User from '../models/user';
import {startOfDay, endOfDay} from 'date-fns';
import mongoose from 'mongoose';

export const getNthToLastWorkout = async (req: Request, res: Response) => {
	try {
		const queryNum = Number(req.query.nToLast as string);
		const nToLast = !isNaN(queryNum) && queryNum > 0 ? queryNum : 1;
		const workouts = await Workout.find({}).limit(nToLast).sort({createdAt: -1}).exec();
		if (!workouts) {
			return res.status(400).json({message: 'You havent\'t recorded any workouts yet'});
		}

		return res.json(workouts);
	} catch (err: unknown) {
		const error = err as Error | mongoose.Error;
		if (error instanceof mongoose.Error) {
			return res.status(400).json({error: `Mongoose error: ${error.message}`});
		}

		return res.status(400).json({error: `Native error: ${error.message}`});
	}
};

export const handleCreateWorkout = async (req: Request<Record<string, unknown>, Record<string, unknown>, IWorkout>, res: Response) => {
	try {
		const {user, createdAt, sets} = req.body;
		const newSet = sets[0];

		const userObject = await User.findOne({name: user}).select('name email').exec();

		if (!userObject) {
			return;
		}

		const query = {createdAt: {
			$gt: startOfDay(new Date(createdAt)),
			$lt: endOfDay(new Date(createdAt)),
		}};

		const update = {
			user: userObject._id,
			$push: {sets: {newSet}},
		};

		const options = {upsert: true, new: true, setDefaultsOnInsert: true};

		const workout = await Workout.findOneAndUpdate(query, update, options);

		console.log(workout);
		return res.status(200).json({message: `Successfully added a set of ${newSet.exercise}`});
	} catch (err: unknown) {
		const error = err as Error | mongoose.Error;
		if (error instanceof mongoose.Error) {
			return res.status(400).json({error: `Mongoose error: ${error.message}`});
		}

		return res.status(400).json({error: `Native error: ${error.message}`});
	}
};
