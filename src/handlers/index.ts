import { Composer } from 'grammy';
import start from './start.js';
import recordSet from './recordSet.js';
import nextWorkout from './nextWorkout.js';
import addExercise from './addExercise/populateExercises.js';
import settings from './settings.js';
import editExerciseMenu from './editExercises/editExerciseMenu.js';
import type { MyContext } from '../types/bot.js';

const composer = new Composer<MyContext>();

// only save message_id coming from callbackQuery
composer.use(async (ctx, next) => {
  if (ctx.callbackQuery?.message?.message_id) {
    ctx.session.state.lastMessageId = ctx.callbackQuery.message.message_id;
  }

  await next();
})
composer.filter((ctx) => ctx.chat?.type === 'private');
composer.use(start);
composer.use(settings);
composer.use(addExercise);
composer.use(recordSet);
composer.use(nextWorkout);
composer.use(editExerciseMenu);

export default composer;
