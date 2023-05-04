import { Composer } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '../types/bot.js';
import {
  getRpeOptions,
  getMenuFromStringArray,
  backButton,
  getYesNoOptions
} from '../config/keyboards.js';
import { createOrUpdateUserWorkout } from '../models/user.js';
import { userHasExercises } from '../middleware/userHasExercises.js';
import {
  promptUserForPredefinedString,
  promptUserForRPE,
  promptUserForRepetitions,
  promptUserForWeight
} from './helpers/promptUser.js';
import { successMessages } from './helpers/successMessages.js';
import {isToday} from 'date-fns';
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
    let { lastMessageId } = conversation.session.state;

    const categories = new Set(exercises.map((exercise) => exercise.category));
    const exercisesByCategory = getExercisesByCategory(categories, exercises);
    const isTodaysWorkout = isToday(mostRecentWorkout.createdAt);

    const isDeload = isTodaysWorkout 
      ? mostRecentWorkout.isDeload 
      : await isDeloadWorkout(ctx, conversation);

    if (isTodaysWorkout) {
      const {message_id} = await ctx.reply('continuing workout...');
      conversation.session.state.lastMessageId = message_id;
      lastMessageId = message_id;
      await conversation.sleep(500);
    }

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
    const updatedWorkout = await conversation.external(async () =>
      createOrUpdateUserWorkout(user_id, setData, isDeload)
    );

   await ctx.api.editMessageText(
     chat_id,
     lastMessageId,
     successMessages.onRecordSetSuccess,
     {
      reply_markup: getYesNoOptions('recordSet'),
      parse_mode: 'HTML'
     }
   );

   ctx = await conversation.waitForCallbackQuery(['recordSet:yes', 'recordSet:no']);

   if (ctx.callbackQuery?.data === 'recordSet:yes') {
     await ctx.answerCallbackQuery();
     return await ctx.conversation.reenter('handleRecordSet');
   }

   await ctx.api.deleteMessage(chat_id, lastMessageId);
  } catch (err: unknown) {
    console.log(err);
  }
}

async function chooseExercise(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  categories: Set<string>,
  exercisesByCategory: Map<string, string[]>
): Promise<string> {
  const { lastMessageId } = conversation.session.state;

  const chooseCategoryText =
    '<b>Record exercise</b>\n\n<i>Choose a category:</i>';
  const chooseCategoryOptions = {
    reply_markup: getMenuFromStringArray([...categories], 'recordSet'),
    parse_mode: 'HTML'
  };

  const category = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    chooseCategoryText,
    chooseCategoryOptions,
    [...categories]
  );

  const chooseExerciseText = `<b>Record exercise</b>\n\n<b>${category}</b>\n\n<i>Choose an exercise:</i>`;
  const chooseExerciseOptions = {
    reply_markup: getMenuFromStringArray(
      exercisesByCategory.get(category)!,
      'recordSet',
      { addBackButton: true }
    ),
    parse_mode: 'HTML'
  };

  const exercise = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    chooseExerciseText,
    chooseExerciseOptions,
    [backButton, ...exercisesByCategory.get(category)!]
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
  const { lastMessageId } = conversation.session.state;

  const weightTextOptions = { parse_mode: 'HTML' };
  const weightText = `<b>${exercise.toUpperCase()}</b>\n\nType in the weight:`;
  const weight = await promptUserForWeight(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    weightText,
    weightTextOptions
  );

  const repetitionsTextOptions = { parse_mode: 'HTML' };
  const repetitionsText = `<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs</i>\n\nType in the repetitions:`;
  const repetitions = await promptUserForRepetitions(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    repetitionsText,
    repetitionsTextOptions
  );

  const rpeTextOptions = {
    parse_mode: 'HTML',
    reply_markup: getRpeOptions('recordSet')
  };
  const rpeText = `<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs x ${repetitions}</i>\n\nChoose the RPE:`;
  const rpe = await promptUserForRPE(
    ctx,
    conversation,
    chat_id,
    lastMessageId,
    rpeText,
    rpeTextOptions
  );

  return { exercise, weight, repetitions, rpe };
}

async function isDeloadWorkout(
  ctx: MyContext,
  conversation: MyConversation
) {
  const { message_id } = await ctx.reply('Is it a <b>deload workout</b>?', {
    parse_mode: 'HTML',
    reply_markup: getYesNoOptions('recordSet')
  });

  conversation.session.state.lastMessageId = message_id;

  const {
    callbackQuery: { data }
  } = await conversation.waitForCallbackQuery([
    'recordSet:yes',
    'recordSet:no'
  ]);

  return data.split(':')[1] === 'yes' ? true : false;
}

function getExercisesByCategory(categories: Set<string>, exercises: ExerciseType[]) {

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

composer.command('record_set', userHasExercises, async (ctx) =>
  ctx.conversation.enter('handleRecordSet')
);
composer.callbackQuery('/record_set', userHasExercises, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('handleRecordSet')
});

export default composer;
