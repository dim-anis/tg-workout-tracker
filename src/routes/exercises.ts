import express from 'express';
import {getAllExercises, findExerciseByName, findExercisesByCategory} from '../controllers/exercises.js';

const router = express.Router();

const allExercises = router.get('/', getAllExercises);

export default allExercises;
