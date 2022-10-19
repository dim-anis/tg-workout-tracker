import express from 'express';
import {getNthToLastWorkout, handleCreateWorkout} from '../controllers/workouts';

const router = express.Router();

router.get('/', getNthToLastWorkout);
router.put('/', handleCreateWorkout);

export default router;
