import { type NextFunction } from 'grammy';
import { type MyContext } from 'types/bot.js';
import { sendNotEnoughWorkoutsError } from '../handlers/helpers/errors.js';

export async function userHasEnoughWorkouts(
  ctx: MyContext,
  next: NextFunction
) {
  const {
    recentWorkouts,
    settings: { splitLength }
  } = ctx.dbchat;

  if (recentWorkouts.length >= splitLength) {
    await next();
    return;
  }

  await ctx.answerCallbackQuery();
  return sendNotEnoughWorkoutsError(ctx);
}
