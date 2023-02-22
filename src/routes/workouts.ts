import express from 'express';
import {getWorkouts, createWorkout, getWorkoutById} from '../controllers/workouts';

const router = express.Router();

router
	.route('/')
	.get(getWorkouts)
	.put(createWorkout);

// Router.get('/:id', getWorkoutById);

export default router;
