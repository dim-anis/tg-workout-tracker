import {Composer} from 'grammy';
import start from './start';
import recordSet from './recordSet';
import nextWorkout from './nextWorkout';
import settings from './settings';
import addExercise from './addExercise';
import editExerciseMenu from './editExercises/editExerciseMenu';
import type {MyContext} from '../types/bot';

const composer = new Composer<MyContext>();

composer.filter(ctx => ctx.chat?.type === 'private');
composer.use(start);
composer.use(settings);
composer.use(recordSet);
composer.use(nextWorkout);
composer.use(addExercise);
composer.use(editExerciseMenu);

export default composer;
