import { exerciseCategories } from "@/config/exercises.js";
import { InlineKeyboardOptions, getYesNoOptions } from "@/config/keyboards.js";
import {
  promptUserForExerciseName,
  promptUserForYesNo,
} from "@/helpers/prompts.js";
import { categoriesMenu, categoriesMenuText } from "@/menus/editExercise.js";
import { userHasExercises } from "@/middleware/userHasExercises.js";
import { updateUserExercise } from "@/models/user.js";
import { MyContext, MyConversation } from "@/types/bot.js";
import { createConversation } from "@grammyjs/conversations";
import { Composer, InlineKeyboard } from "grammy";

export const EDIT_EXERCISES_CONVERSATION = "editExercises";

const composer = new Composer<MyContext>();

export function editExerciseConversation() {
  return createConversation(
    async (conversation: MyConversation, ctx: MyContext) => {
      if (!ctx.chat) {
        return;
      }

      const currName = conversation.session.state.data;
      const { lastMessageId } = conversation.session.state;
      const { id: chat_id } = ctx.chat;

      const newNameText = `<b>Edit ${currName.toLocaleUpperCase()}</b>\n\nType in the new name:`;
      const newNameOptions: InlineKeyboardOptions = {
        parse_mode: "HTML",
        reply_markup: undefined,
      };
      const promptForNameResult = await promptUserForExerciseName(
        ctx,
        conversation,
        chat_id,
        lastMessageId,
        newNameText,
        newNameOptions,
      );

      if (!promptForNameResult) {
        return;
      }

      const newName = promptForNameResult.data;
      ctx = promptForNameResult.context;

      if (newName === undefined) return;

      const isCompoundText =
        `📋 <b>Edit ${newName.toUpperCase()}</b>\n\n` +
        "Is it a compound exercise?\n\n" +
        "<i>*Involving two or more joints at once, think heavy exercises like squats, bench press etc.</i>";
      const isCompoundTextOptions: InlineKeyboardOptions = {
        parse_mode: "HTML",
        reply_markup: getYesNoOptions("editExercise"),
      };
      const promptForYesNoResult = await promptUserForYesNo(
        ctx,
        conversation,
        chat_id,
        lastMessageId,
        isCompoundText,
        isCompoundTextOptions,
      );

      if (!promptForYesNoResult) {
        return;
      }

      const isCompound = promptForYesNoResult.data;
      ctx = promptForYesNoResult.context;

      if (isCompound === undefined) return;

      const is_compound = isCompound.toLowerCase().trim() === "yes";

      const categoryText = `📋 <b>Edit ${newName.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`;
      const categoryOptions: InlineKeyboardOptions = {
        parse_mode: "HTML",
        reply_markup: getExerciseCategoriesMenu(exerciseCategories),
      };
      const promptForCategoryResult = await promptUserForExerciseName(
        ctx,
        conversation,
        chat_id,
        lastMessageId,
        categoryText,
        categoryOptions,
      );

      if (!promptForCategoryResult) {
        return;
      }

      const category = promptForCategoryResult.data;
      ctx = promptForCategoryResult.context;

      if (category === undefined) return;

      const createdExercise = await conversation.external(
        async () =>
          await updateUserExercise(ctx.dbchat.user_id, currName, {
            name: newName,
            category,
            is_compound,
          }),
      );

      if (!createdExercise) {
        throw new Error("Failed to update exercise");
      }

      await ctx.editMessageText(`👌 <b>${newName.toUpperCase()}</b> updated!`, {
        parse_mode: "HTML",
      });
    },
  );
}

function getExerciseCategoriesMenu(categories: string[]) {
  const categoryOptionsKbd = new InlineKeyboard();
  for (const [index, cat] of categories.entries()) {
    if (index % 3 === 0) {
      categoryOptionsKbd.row();
    }

    categoryOptionsKbd.text(cat);
  }

  return categoryOptionsKbd;
}

composer.use(createConversation(editExerciseConversation));
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
