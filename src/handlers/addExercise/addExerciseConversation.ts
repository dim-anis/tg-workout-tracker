import type { MyConversation, MyContext } from '../../types/bot.js';
import {
  getMenuFromStringArray,
  getYesNoOptions
} from '../../config/keyboards.js';
import { exerciseCategories } from '../../config/exercises.js';
import { createUserExercise } from '../../models/user.js';
import {
  promptUserForExerciseName,
  promptUserForYesNo
} from '../helpers/promptUser.js';

export default async function handleAddExercise(
  conversation: MyConversation,
  ctx: MyContext
) {
  if (!ctx.chat) {
    return;
  }

  const { user_id } = ctx.dbchat;
  const { lastMessageId } = ctx.session.state;
  const { id: chat_id } = ctx.chat;

  try {
    const nameText = '📋 <b>Add new exercise</b>\n\nType in the name:';
    const nameOptions = { parse_mode: 'HTML', reply_markup: undefined };
    const name = await promptUserForExerciseName(
      ctx,
      conversation,
      chat_id,
      lastMessageId,
      nameText,
      nameOptions
    );

    const isCompoundText =
      `📋 <b>Add ${name.toUpperCase()}</b>\n\n` +
      'Is it a compound exercise?\n\n' +
      '<i>*Involving two or more joints at once, think heavy exercises like squats, bench press etc.</i>';
    const isCompoundTextOptions = {
      parse_mode: 'HTML',
      reply_markup: getYesNoOptions('addExercise')
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

    const categoryText = `📋 <b>Add ${name.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`;
    const categoryOptions = {
      parse_mode: 'HTML',
      reply_markup: getMenuFromStringArray(exerciseCategories, 'addEx', {
        nColumns: 3
      })
    };
    const category = await promptUserForExerciseName(
      ctx,
      conversation,
      chat_id,
      lastMessageId,
      categoryText,
      categoryOptions
    ); // <- same logic as in promptUserForExerciseName

    const updatedUser = await conversation.external(async () =>
      createUserExercise(user_id, { name, category, is_compound })
    );

    if (!updatedUser) {
      throw new Error('Failed to create exercise');
    }

    const newExericse = updatedUser.exercises[updatedUser.exercises.length - 1];
    ctx.dbchat.exercises.push(newExericse);

    await ctx.api.editMessageText(
      chat_id,
      lastMessageId,
      `📋 <b>Add new exercise</b>\n\nYou've added <b>${name.toUpperCase()}</b> to your exercise list!`,
      {
        parse_mode: 'HTML'
      }
    );
  } catch (e) {
    console.log(e);
  }
}
