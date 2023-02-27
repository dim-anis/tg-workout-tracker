import {Composer} from 'grammy';
import start from './start';
import recordSet from './recordSet';
import nextWorkout from './nextWorkout';
import settings from './settings';
import editExercises from './editExercises';

import type {MyContext} from 'bot/types/bot';

const composer = new Composer<MyContext>();

composer.filter(ctx => ctx.chat?.type === 'private');
composer.use(start);
composer.use(settings);
composer.use(recordSet);
composer.use(nextWorkout);
composer.use(editExercises);

export default composer;
