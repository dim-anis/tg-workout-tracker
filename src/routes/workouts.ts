import express from 'express';
import {getAllWorkouts, createWorkout, getWorkoutById} from '../controllers/workouts';

const router = express.Router();

router.get('/', getAllWorkouts);
router.put('/', createWorkout);

router.get('/:id', getWorkoutById);

export default router;
