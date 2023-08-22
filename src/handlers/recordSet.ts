import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '../types/bot.js';
import {
  getMenuFromStringArray,
  getYesNoOptions,
  InlineKeyboardOptions
} from '../config/keyboards.js';
import { createOrUpdateUserWorkout } from '../models/user.js';
import { userHasExercises } from '../middleware/userHasExercises.js';
import { promptUserForPredefinedString, promptUserForYesNo } from './helpers/promptUser.js';
import { successMessages } from './helpers/textMessages.js';
import { ExerciseType } from 'models/exercise.js';
import { RecordExerciseParams, getSetData, determineIsDeload } from './helpers/workoutUtils.js';

const composer = new Composer<MyContext>();
const CMD_PREFIX = 'recordSet';

const handleRecordSet = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  try {
    let isFinished = false;
    let iteration = 1;
    const { user_id, exercises } = ctx.dbchat;
    const { isMetric } = ctx.dbchat.settings;
    const { id: chat_id } = ctx.chat;

    const categories = new Set(exercises.map((exercise) => exercise.category));
    const exercisesByCategory = getExercisesByCategory(categories, exercises);

    const result = await determineIsDeload(ctx, conversation, { cmdPrefix: CMD_PREFIX, iteration });

    if (!result) {
      return;
    }

    const { isDeload, ctx: updatedContext } = result;

    ctx = updatedContext;

    if (isDeload === undefined) {
      await ctx.deleteMessage();
      return;
    }

    while (!isFinished) {
      const selectedExercise = await chooseExercise(
        ctx,
        conversation,
        chat_id,
        categories,
        exercisesByCategory
      );

      if (selectedExercise === undefined) {
        return;
      }

      const exerciseParams: RecordExerciseParams = {
        selectedExercise,
        weightUnit: isMetric ? 'kg' : 'lb',
      }

      const getSetDataResult = await getSetData(
        conversation,
        ctx,
        chat_id,
        conversation.session.state.lastMessageId,
        exerciseParams
      );

      if (getSetDataResult === undefined) {
        iteration += 1;
        continue;
      }

      const setData = getSetDataResult.data;
      ctx = getSetDataResult.newContext;

      await conversation.external(
        async () => await createOrUpdateUserWorkout(user_id, setData, isDeload as boolean)
      );

      const continueWorkoutResult = await promptUserForYesNo(
        ctx,
        conversation,
        chat_id,
        ctx.session.state.lastMessageId,
        successMessages.onRecordSetSuccess,
        {
          reply_markup: getYesNoOptions(CMD_PREFIX),
          parse_mode: 'HTML'
        }
      )

      if (!continueWorkoutResult) {
        return;
      }

      const continueWorkout = continueWorkoutResult.data;
      ctx = continueWorkoutResult.context;

      if (continueWorkout === 'yes') {
        iteration += 1;
        continue;
      }

      isFinished = true;
    }

    await ctx.deleteMessage();
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
): Promise<string | undefined> {
  const cmdTitle = '<b>Record exercise</b>';
  const chooseCategoryText =
    cmdTitle + '\n\n<i>Choose a category:</i>';
  const chooseCategoryOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray([...categories], CMD_PREFIX, { addBackButton: true }),
    parse_mode: 'HTML'
  };

  const backButtonCbData = `${CMD_PREFIX}:goBack`;

  const promptForCategoryResult = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseCategoryText,
    chooseCategoryOptions,
    [...categories, backButtonCbData]
  );

  if (promptForCategoryResult === undefined) {
    return;
  }

  const category = promptForCategoryResult.data;
  ctx = promptForCategoryResult.context;

  if (category === undefined) {
    await ctx.deleteMessage();
    return;
  }

  const chooseExerciseText = cmdTitle + ` > <b>${category}</b>\n\n<i>Choose an exercise:</i>`;
  const chooseExerciseOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray(
      exercisesByCategory.get(category) as string[],
      CMD_PREFIX,
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
    [...(exercisesByCategory.get(category) as string[]), backButtonCbData]
  );

  if (!promptForExerciseResult) {
    return '';
  }

  const exercise = promptForExerciseResult.data;
  ctx = promptForExerciseResult.context;

  if (exercise === undefined) {
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
