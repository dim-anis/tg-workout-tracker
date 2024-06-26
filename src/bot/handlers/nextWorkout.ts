import { Composer } from "grammy";
import type { MyContext } from "@/bot/types/bot.js";
import { userHasEnoughWorkouts } from "@/bot/middleware/userHasEnoughWorkouts.js";
import {
  NEXT_WORKOUT_CONVERSATION,
  nextWorkoutConversation,
} from "@/bot/conversations/nextWorkout.js";

const composer = new Composer<MyContext>();

const feature = composer.chatType("private");

feature.use(nextWorkoutConversation());

feature.callbackQuery("/next_workout", userHasEnoughWorkouts, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter(NEXT_WORKOUT_CONVERSATION);
});

feature.command(
  "next_workout",
  userHasEnoughWorkouts,
  async (ctx) => await ctx.conversation.enter(NEXT_WORKOUT_CONVERSATION),
);

export default composer;
