import express from 'express';
import {getAllExercises, findExerciseByName, findExercisesByCategory, createExercise} from '../controllers/exercises.js';

const router = express.Router();

router
	.route('/')
	.get(getAllExercises)
	.put(createExercise);

export default router;
