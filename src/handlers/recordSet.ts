import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '../types/bot.js';
import {
  getMenuFromStringArray,
  backButton,
  getYesNoOptions,
  InlineKeyboardOptions
} from '../config/keyboards.js';
import { createOrUpdateUserWorkout } from '../models/user.js';
import { userHasExercises } from '../middleware/userHasExercises.js';
import {
  promptUserForPredefinedString,
  promptUserForRPE,
  promptUserForRepetitions,
  promptUserForWeight,
  isDeloadWorkout
} from './helpers/promptUser.js';
import { successMessages } from './helpers/successMessages.js';
import { isToday } from 'date-fns';
import { ExerciseType } from 'models/exercise.js';

const composer = new Composer<MyContext>();

const handleRecordSet = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  try {
    const { user_id, exercises } = ctx.dbchat;
    const { id: chat_id } = ctx.chat;
    const mostRecentWorkout = ctx.dbchat.recentWorkouts[0];

    const categories = new Set(exercises.map((exercise) => exercise.category));
    conversation.log(categories);
    const exercisesByCategory = getExercisesByCategory(categories, exercises);
    const isTodaysWorkout = isToday(mostRecentWorkout.createdAt);

    const isDeload = isTodaysWorkout
      ? mostRecentWorkout.isDeload
      : await isDeloadWorkout(ctx, conversation, 'recordSet');

    const chosenExercise = await chooseExercise(
      ctx,
      conversation,
      chat_id,
      categories,
      exercisesByCategory
    );
    const setData = await getSetData(
      ctx,
      conversation,
      chosenExercise,
      chat_id
    );
    await conversation.external(
      async () => await createOrUpdateUserWorkout(user_id, setData, isDeload)
    );

    await ctx.api.editMessageText(
      chat_id,
      conversation.session.state.lastMessageId,
      successMessages.onRecordSetSuccess,
      {
        reply_markup: getYesNoOptions('recordSet'),
        parse_mode: 'HTML'
      }
    );

    ctx = await conversation.waitForCallbackQuery([
      'recordSet:yes',
      'recordSet:no'
    ]);

    if (ctx.callbackQuery?.data === 'recordSet:yes') {
      await ctx.answerCallbackQuery();
      return await ctx.conversation.reenter('handleRecordSet');
    }

    await ctx.api.deleteMessage(
      chat_id,
      conversation.session.state.lastMessageId
    );
  } catch (err: unknown) {
    console.log(err);
  }
};

async function chooseExercise(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  categories: Set<string>,
  exercisesByCategory: Map<string, string[]>
): Promise<string> {
  const chooseCategoryText =
    '<b>Record exercise</b>\n\n<i>Choose a category:</i>';
  const chooseCategoryOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray([...categories], 'recordSet'),
    parse_mode: 'HTML'
  };

  const category = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseCategoryText,
    chooseCategoryOptions,
    [...categories]
  );

  const chooseExerciseText = `<b>Record exercise</b>\n\n<b>${category}</b>\n\n<i>Choose an exercise:</i>`;
  const chooseExerciseOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray(
      exercisesByCategory.get(category) as string[],
      'recordSet',
      { addBackButton: true }
    ),
    parse_mode: 'HTML'
  };

  const exercise = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseExerciseText,
    chooseExerciseOptions,
    [backButton, ...(exercisesByCategory.get(category) as string[])]
  );

  if (exercise === backButton) {
    return chooseExercise(
      ctx,
      conversation,
      chat_id,
      categories,
      exercisesByCategory
    );
  }

  return exercise;
}

async function getSetData(
  ctx: MyContext,
  conversation: MyConversation,
  exercise: string,
  chat_id: number
) {
  const weight = await promptUserForWeight(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    {selectedExercise: exercise}
  );

  const repetitions = await promptUserForRepetitions(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    {selectedExercise: exercise},
    weight
  );

  const rpe = await promptUserForRPE(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    {selectedExercise: exercise},
    weight,
    repetitions
  );

  return { exercise, weight, repetitions, rpe };
}

function getExercisesByCategory(
  categories: Set<string>,
  exercises: ExerciseType[]
) {
  const exercisesByCategory = new Map<string, string[]>();

  for (const category of categories) {
    exercisesByCategory.set(category, []);
  }

  for (const exercise of exercises) {
    exercisesByCategory.get(exercise.category)?.push(exercise.name);
  }

  return exercisesByCategory;
}

composer.use(createConversation(handleRecordSet));

composer.command(
  'record_set',
  userHasExercises,
  async (ctx) => await ctx.conversation.enter('handleRecordSet')
);
composer.callbackQuery('/record_set', userHasExercises, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('handleRecordSet');
});

export default composer;
