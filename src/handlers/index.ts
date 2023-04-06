import {Composer} from 'grammy';
import start from './start';
import recordSet from './recordSet';
import nextWorkout from './nextWorkout';
import addExercise from './addExercise/populateExercises';
import settings from './settings';
import editExerciseMenu from './editExercises/editExerciseMenu';
import type {MyContext} from '../types/bot';
import {userHasExercises} from '../middleware/userHasExercises';
import {userHasEnoughWorkouts} from '../middleware/userHasEnoughWorkouts';

const composer = new Composer<MyContext>();

composer.filter(ctx => ctx.chat?.type === 'private');
composer.use(start);
composer.use(settings);
composer.use(addExercise);
composer.use(userHasExercises, recordSet);
composer.use(userHasEnoughWorkouts, nextWorkout);
composer.use(userHasExercises, editExerciseMenu);

export default composer;
