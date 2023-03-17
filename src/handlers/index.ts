import {Composer} from 'grammy';
import start from './start';
import recordSet from './recordSet';
import nextWorkout from './nextWorkout';
import settings from './settings';
import editExercises from './editExercises';
import experimentalEdit from './experimentalEdit';
import type {MyContext} from '../types/bot';

const composer = new Composer<MyContext>();

composer.filter(ctx => ctx.chat?.type === 'private');
composer.use(start);
composer.use(settings);
composer.use(recordSet);
composer.use(nextWorkout);
composer.use(editExercises);
composer.use(experimentalEdit);

export default composer;
