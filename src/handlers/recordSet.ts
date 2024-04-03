import { Composer } from "grammy";
import type { MyContext } from "@/types/bot.js";
import { userHasExercises } from "@/middleware/userHasExercises.js";
import {
  RECORD_SET_CONVERSATION,
  recordSetConversation,
} from "@/conversations/recordSet.js";

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
