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
  isDeloadWorkout
} from './helpers/promptUser.js';
import { successMessages } from './helpers/textMessages.js';
import { isToday } from 'date-fns';
import { ExerciseType } from 'models/exercise.js';
import { RecordExerciseParams, getSetData } from './helpers/workoutUtils.js';

const composer = new Composer<MyContext>();

const handleRecordSet = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  try {
    let finished = false;
    const { user_id, exercises } = ctx.dbchat;
    const { isMetric } = ctx.dbchat.settings;
    const { id: chat_id } = ctx.chat;
    const mostRecentWorkout = ctx.dbchat.recentWorkouts[0];

    const categories = new Set(exercises.map((exercise) => exercise.category));
    const exercisesByCategory = getExercisesByCategory(categories, exercises);
    const isTodaysWorkout = isToday(mostRecentWorkout.createdAt);

    const isDeload = isTodaysWorkout
      ? mostRecentWorkout.isDeload
      : await isDeloadWorkout(ctx, conversation, conversation.session.state.lastMessageId, 'recordSet');

    while (!finished) {
      const selectedExercise = await chooseExercise(
        ctx,
        conversation,
        chat_id,
        categories,
        exercisesByCategory
      );

      const exerciseParams: RecordExerciseParams = {
        selectedExercise,
        unit: isMetric ? 'kg' : 'lb',
      }

      const getSetDataResult = await getSetData(
        conversation,
        ctx,
        chat_id,
        conversation.session.state.lastMessageId,
        exerciseParams
      );

      // re-enter the loop, it the setData is undefined

      if (getSetDataResult === undefined) {
        continue;
      }

      const setData = getSetDataResult.data;
      ctx = getSetDataResult.newContext;

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

      const continueWorkout = await conversation
        .waitForCallbackQuery([
          'recordSet:yes',
          'recordSet:no'
        ])
        .then((ctx) => ctx.callbackQuery.data);

      if (continueWorkout.split(':')[1] === 'yes') {
        await ctx.answerCallbackQuery();
        continue;
      }

      finished = true;
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

  const promptForCategoryResult = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseCategoryText,
    chooseCategoryOptions,
    [...categories]
  );

  if (!promptForCategoryResult) {
    return '';
  }

  const category = promptForCategoryResult.data;
  ctx = promptForCategoryResult.context;

  const chooseExerciseText = `<b>Record exercise</b>\n\n<b>${category}</b>\n\n<i>Choose an exercise:</i>`;
  const chooseExerciseOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray(
      exercisesByCategory.get(category) as string[],
      'recordSet',
      { addBackButton: true }
    ),
    parse_mode: 'HTML'
  };

  const promptForExerciseResult = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseExerciseText,
    chooseExerciseOptions,
    [backButton, ...(exercisesByCategory.get(category) as string[])]
  );

  if (!promptForExerciseResult) {
    return '';
  }

  const exercise = promptForExerciseResult.data;
  ctx = promptForExerciseResult.context;

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
