import { type NextFunction } from 'grammy';
import { type MyContext } from '@/types/bot.js';
import { sendNoExercisesAddedError } from '@/helpers/errors.js';

export async function userHasExercises(ctx: MyContext, next: NextFunction) {
  if (ctx.dbchat.exercises.length > 0) {
    await next();
    return;
  }

  await ctx.answerCallbackQuery();
  return sendNoExercisesAddedError(ctx);
}
