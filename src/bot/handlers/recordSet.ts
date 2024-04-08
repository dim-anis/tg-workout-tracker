import { Composer } from "grammy";
import type { MyContext } from "@/bot/types/bot.js";
import { userHasExercises } from "@/bot/middleware/userHasExercises.js";
import {
  RECORD_SET_CONVERSATION,
  recordSetConversation,
} from "@/bot/conversations/recordSet.js";

const composer = new Composer<MyContext>();

composer.use(recordSetConversation());

composer.command(
  "record_set",
  userHasExercises,
  async (ctx) => await ctx.conversation.enter(RECORD_SET_CONVERSATION),
);

composer.callbackQuery("/record_set", userHasExercises, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter(RECORD_SET_CONVERSATION);
});

export default composer;
