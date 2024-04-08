import { Composer } from "grammy";
import type { MyContext } from "@/bot/types/bot.js";
import { addExerciseConversation } from "@/bot/conversations/addExercise.js";
import { addExerciseMenu } from "@/bot/menus/addExercise.js";

const composer = new Composer<MyContext>();

composer.use(addExerciseConversation());
composer.use(addExerciseMenu);

composer.callbackQuery("/add_exercise", async (ctx) => {
  await ctx.answerCallbackQuery();
  const { message_id } = await ctx.reply("📋 <b>Add exercise</b>", {
    reply_markup: addExerciseMenu,
    parse_mode: "HTML",
  });
  ctx.session.state.lastMessageId = message_id;
});
composer.command("add_exercise", async (ctx) => {
  const { message_id } = await ctx.reply("📋 <b>Add exercise</b>", {
    reply_markup: addExerciseMenu,
    parse_mode: "HTML",
  });
  ctx.session.state.lastMessageId = message_id;
});

export default composer;
