import { type MyConversation, type MyContext } from '../../types/bot.js';
import { getYesNoOptions } from '../../config/keyboards.js';
import { InlineKeyboard } from 'grammy';
import { updateUserExercise } from '../../models/user.js';
import {
  promptUserForExerciseName,
  promptUserForYesNo
} from '../../handlers/helpers/promptUser.js';
import { exerciseCategories } from '../../config/exercises.js';

function getExerciseCategoriesMenu(categories: string[]) {
  const categoryOptionsKbd = new InlineKeyboard();
  for (const [index, cat] of exerciseCategories.entries()) {
    if (index % 3 === 0) {
      categoryOptionsKbd.row();
    }

    categoryOptionsKbd.text(cat);
  }

  return categoryOptionsKbd;
}

export default async function editExerciseConversation(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (!ctx.chat) {
    return;
  }

  const currName = conversation.session.state.data;
  const { lastMessageId } = conversation.session.state;
  const { id: chat_id } = ctx.chat;

  const newNameText = `<b>Edit ${currName.toLocaleUpperCase()}</b>\n\nType in the new name:`;
  const newNameOptions = { parse_mode: 'HTML', reply_markup: undefined };
  const newName = await promptUserForExerciseName(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    newNameText,
    newNameOptions
  );

  const isCompoundText =
    `📋 <b>Edit ${newName.toUpperCase()}</b>\n\n` +
    'Is it a compound exercise?\n\n' +
    '<i>*Involving two or more joints at once, think heavy exercises like squats, bench press etc.</i>';
  const isCompoundTextOptions = {
    parse_mode: 'HTML',
    reply_markup: await getYesNoOptions('editExercise')
  };
  const isCompound = await promptUserForYesNo(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    isCompoundText,
    isCompoundTextOptions
  );

  const is_compound = isCompound.toLowerCase().trim() === 'yes';

  const categoryText = `📋 <b>Edit ${newName.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`;
  const categoryOptions = {
    parse_mode: 'HTML',
    reply_markup: getExerciseCategoriesMenu(exerciseCategories)
  };
  const category = await promptUserForExerciseName(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    categoryText,
    categoryOptions
  );

  const createdExercise = await conversation.external(async () =>
    updateUserExercise(ctx.dbchat.user_id, currName, {
      name: newName,
      category,
      is_compound
    })
  );

  if (!createdExercise) {
    throw new Error('Failed to update exercise');
  }

  await ctx.editMessageText(`👌 <b>${newName.toUpperCase()}</b> updated!`, {
    parse_mode: 'HTML'
  });
}
