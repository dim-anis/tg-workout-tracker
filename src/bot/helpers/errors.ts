import { type MyContext } from "@/bot/types/bot.js";
import { InlineKeyboard } from "grammy";

export async function sendNotEnoughWorkoutsError(ctx: MyContext) {
  return await ctx.reply(
    "<b>Not enough workouts</b>\n\n" +
      "More data is required to start using <b>next workout</b>\n\n " +
      "<i>you can record workouts using /record_set until you accumulate enough to use /next_workout</i>",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("Record set", "/record_set"),
    },
  );
}

export async function sendNoExercisesAddedError(ctx: MyContext) {
  return await ctx.reply(
    "<b>No exercises recorded</b>\n\n" +
      "At least one exercise is required to proceed\n\n" +
      "<i>use /add_exercise to add your own or choose from a list of preloaded exercises</i>",
    {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text("Add exercise", "/add_exercise"),
    },
  );
}
