import { type NextFunction } from "grammy";
import { type MyContext } from "@/bot/types/bot.js";
import { sendNoExercisesAddedError } from "@/bot/helpers/errors.js";

export async function userHasExercises(ctx: MyContext, next: NextFunction) {
  if (ctx.dbchat.exercises.length > 0) {
    await next();
    return;
  }

  await ctx.answerCallbackQuery();
  return sendNoExercisesAddedError(ctx);
}
