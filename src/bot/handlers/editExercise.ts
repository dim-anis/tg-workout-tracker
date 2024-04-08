import { editExerciseConversation } from "@/bot/conversations/editExercise.js";
import {
  categoriesMenu,
  categoriesMenuText,
} from "@/bot/menus/editExercise.js";
import { userHasExercises } from "@/bot/middleware/userHasExercises.js";
import { MyContext } from "@/bot/types/bot.js";
import { Composer } from "grammy";

const composer = new Composer<MyContext>();

composer.use(editExerciseConversation());
composer.use(categoriesMenu);

composer.command("edit_exercises", userHasExercises, async (ctx) => {
  const { message_id } = await ctx.reply(categoriesMenuText, {
    reply_markup: categoriesMenu,
    parse_mode: "HTML",
  });
  ctx.session.state.lastMessageId = message_id;
});
composer.callbackQuery("/edit_exercises", userHasExercises, async (ctx) => {
  await ctx.answerCallbackQuery();
  const { message_id } = await ctx.reply(categoriesMenuText, {
    reply_markup: categoriesMenu,
    parse_mode: "HTML",
  });
  ctx.session.state.lastMessageId = message_id;
});

export default composer;
