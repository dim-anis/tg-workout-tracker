import { Composer, InlineKeyboard } from 'grammy';
import { createConversation } from '@grammyjs/conversations';
import type { MyConversation, MyContext } from '../types/bot.js';
import {
  getRpeOptions,
  getRepOptions,
  getWeightOptions,
  getYesNoOptions
} from '../config/keyboards.js';
import { type WorkoutType } from '../models/workout.js';
import { countSets, getWorkoutStatsText } from './helpers/workoutStats.js';
import { isSameDay, isToday } from 'date-fns';
import { createOrUpdateUserWorkout } from '../models/user.js';
import { userHasEnoughWorkouts } from '../middleware/userHasEnoughWorkouts.js';
import {
  promptUserForWeight,
  promptUserForRepetitions,
  promptUserForRPE,
} from './helpers/promptUser.js';
import { getCompletedSetsString } from './helpers/calculateSetData.js';

const composer = new Composer<MyContext>();

const handleNextWorkout = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  try {
    const { id: chat_id } = ctx.chat;
    const { splitLength } = ctx.dbchat.settings;
    const { recentWorkouts } = ctx.dbchat;
    const mostRecentWorkout = recentWorkouts[0];
    const isTodayWorkout = isSameDay(mostRecentWorkout.createdAt, Date.now());

    const isCalledFromCmd = typeof ctx.match === 'string' && ctx.match.split('')[0] === '/';
    const isDeload = isToday(mostRecentWorkout.createdAt)
      ? mostRecentWorkout.isDeload 
      : await isDeloadWorkout(ctx, conversation);
    let { lastMessageId } = conversation.session.state;
    const workoutCount = calculateWorkoutCount(recentWorkouts, isTodayWorkout);
    const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength);
    const previousWorkoutExercises = [
      ...new Set(previousWorkout.sets.map((set) => set.exercise))
    ];
    const workoutTitle = `<b>Workout #${workoutCount} of Current Mesocycle</b>\n\n<i>Select an exercise:</i>`;
    const setCountMap = isTodayWorkout ? countSets(mostRecentWorkout.sets) : {};
    const exerciseOptions = generateExerciseOptions(previousWorkoutExercises, setCountMap); 
    
    if (!isCalledFromCmd) {
      await ctx.api.editMessageText(
        chat_id,                          
        lastMessageId,                    
        workoutTitle, {                   
        reply_markup: exerciseOptions,    
        parse_mode: 'HTML'                
      });                                 
    } else {
      const {message_id} = await ctx.reply(
        workoutTitle, {
        reply_markup: exerciseOptions,
        parse_mode: 'HTML'
      });

      conversation.session.state.lastMessageId = message_id;
      lastMessageId = message_id;
    }
    
    const {
      callbackQuery: { data: selectedExercise }
    } = await conversation.waitForCallbackQuery(previousWorkoutExercises);
    const previousWorkoutSetData = getPreviousWorkoutSetData(
      selectedExercise,
      previousWorkout
    );

    if (!previousWorkoutSetData) {
      throw new Error('No data found for this exercise');
    }

    const { previousWeight, previousReps, hitAllReps } = previousWorkoutSetData;

    const exerciseParams = {
      selectedExercise,
      previousWeight,
      previousReps,
      hitAllReps
    };

    const updatedCurrentWorkout = await recordSet(
      conversation,
      ctx,
      chat_id,
      lastMessageId,
      exerciseParams,
      setCountMap[selectedExercise],
      isDeload
    );

   await ctx.api.editMessageText(
     chat_id,
     lastMessageId,
     'Continue the workout?',
     {reply_markup: getYesNoOptions('nextWorkout')}
   );

   ctx = await conversation.waitForCallbackQuery(['nextWorkout:yes', 'nextWorkout:no']);
   if (ctx.callbackQuery?.data === 'nextWorkout:yes') {
     await ctx.answerCallbackQuery();
     return await ctx.conversation.reenter('handleNextWorkout');
   }

    const workoutStatsText = getWorkoutStatsText(
      updatedCurrentWorkout,
      workoutCount
    );

    await ctx.api.editMessageText(
      chat_id,
      lastMessageId,
      workoutStatsText,
      { parse_mode: 'HTML' }
    );
  } catch (err: unknown) {
    console.log(err);
  }
};

async function getWeight(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  selectedExercise: string,
  previousWeight: number,
  hitAllReps: boolean,
  setCount: number
) {
  const weightText =
    `<b>${selectedExercise.toUpperCase()} ${getCompletedSetsString(
      setCount
    )}</b>\n\n` +
    'Please enter the weight\n\n' +
    `Last working weight: <b>${previousWeight}kg</b>\n\n` +
    `${hitAllReps ? '✅' : "❌ didn't"} hit all reps last time`;

  const options = {
    reply_markup: getWeightOptions(previousWeight, 'nextWorkout'),
    parse_mode: 'HTML'
  };

  return promptUserForWeight(
    ctx,
    conversation,
    chat_id,
    message_id,
    weightText,
    options
  );
}

async function getRepetitions(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  selectedExercise: string,
  previousReps: number,
  hitAllReps: boolean,
  setCount: number
) {
  const repetitionsText =
    `<b>${selectedExercise.toUpperCase()} ${getCompletedSetsString(
      setCount
    )}</b>\n\n` +
    'Please enter the repetitions\n\n' +
    `Expected number of repetitions: <b>${previousReps}</b>\n\n` +
    `${hitAllReps ? '✅' : "❌ didn't"} hit all reps last time`;

  const options = {
    reply_markup: getRepOptions(previousReps, 'nextWorkout'),
    parse_mode: 'HTML'
  };

  return promptUserForRepetitions(
    ctx,
    conversation,
    chat_id,
    message_id,
    repetitionsText,
    options
  );
}

async function getRPE(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  selectedExercise: string,
  setCount: number
) {
  const rpeText =
    `<b>${selectedExercise.toUpperCase()} ${getCompletedSetsString(
      setCount
    )}</b>\n\n` + 'Please enter the RPE\n\nHow hard was this set?';

  const options = {
    reply_markup: getRpeOptions('nextWorkout'),
    parse_mode: 'HTML'
  };

  return promptUserForRPE(
    ctx,
    conversation,
    chat_id,
    message_id,
    rpeText,
    options
  );
}

async function recordSet(
  conversation: MyConversation,
  ctx: MyContext,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
  setCount: number,
  isDeload: boolean
): Promise<WorkoutType> {
  const { selectedExercise, previousWeight, previousReps, hitAllReps } =
    exerciseParams;

  const weight = await getWeight(
    ctx,
    conversation,
    chat_id,
    message_id,
    selectedExercise,
    previousWeight,
    hitAllReps,
    setCount
  );
  const repetitions = await getRepetitions(
    ctx,
    conversation,
    chat_id,
    message_id,
    selectedExercise,
    previousReps,
    hitAllReps,
    setCount
  );
  const rpe = await getRPE(
    ctx,
    conversation,
    chat_id,
    message_id,
    selectedExercise,
    setCount
  );
  const setData = { exercise: selectedExercise, weight, repetitions, rpe };

  const updatedWorkout = await conversation.external(() =>
    createOrUpdateUserWorkout(ctx.dbchat.user_id, setData, isDeload)
  );

  return updatedWorkout;
}

type RecordExerciseParams = {
  selectedExercise: string;
  previousWeight: number;
  previousReps: number;
  hitAllReps: boolean;
};

function getPreviousWorkout(
  recentWorkouts: WorkoutType[],
  splitLength: number
) {
  const isSameWorkout = isSameDay(recentWorkouts[0].createdAt, new Date());
  let workoutNumber = splitLength - 1;

  if (isSameWorkout) {
    workoutNumber += 1;
  }

  if (workoutNumber === splitLength - 1) {
    return recentWorkouts[workoutNumber];
  }

  return recentWorkouts[workoutNumber];
}

function getPreviousWorkoutSetData(
  selectedExercise: string,
  previousWorkout: WorkoutType
) {
  const allSets = previousWorkout.sets.filter(
    (set) => set.exercise === selectedExercise
  );

  // Exercise '${selectedExercise}' was not performed in the previous workout
  if (allSets.length === 0) {
    return null;
  }

  // if isDeload => cut sets, reps in 2, later cut weight in 2, possibly make choosing type of deload an option in settings
  const previousWeight = allSets[allSets.length - 1].weight;
  const previousReps = allSets[allSets.length - 1].repetitions;
  const hitAllReps = allSets.every((set) => set.repetitions >= previousReps);

  return { previousWeight, previousReps, hitAllReps };
}

const calculateWorkoutCount = (workouts: WorkoutType[], isTodayWorkout = false) => {
  const deloadIndex = workouts.findIndex((w) => w.isDeload);
  const latestWorkoutDate = workouts[0]?.createdAt;

  if (latestWorkoutDate && isTodayWorkout) {
    return deloadIndex === -1
      ? workouts.length
      : workouts.slice(0, deloadIndex).length;
  } else {
    return deloadIndex === -1
      ? workouts.length + 1
      : workouts.slice(0, deloadIndex).length + 1;
  }
};

async function isDeloadWorkout(
  ctx: MyContext,
  conversation: MyConversation
) {
  const { message_id } = await ctx.reply('Is it a <b>deload workout</b>?', {
    parse_mode: 'HTML',
    reply_markup: getYesNoOptions('nextWorkout')
  });

  conversation.session.state.lastMessageId = message_id;

  const {
    callbackQuery: { data }
  } = await conversation.waitForCallbackQuery([
    'nextWorkout:yes',
    'nextWorkout:no'
  ]);
  return data.split(':')[1] === 'yes' ? true : false;
}

function generateExerciseOptions(previousWorkoutExercises: string[], setCountMap: Record<string, number>) {
  const exerciseOptions = new InlineKeyboard();
  for (const exerciseName of previousWorkoutExercises) {
    const numberOfCompletedSets = setCountMap[exerciseName];
    const buttonLabel = `${exerciseName} ${getCompletedSetsString(
      numberOfCompletedSets
    )}`;
                                                                   
    exerciseOptions.text(buttonLabel, exerciseName).row();
  }

  return exerciseOptions;
}

composer.use(createConversation(handleNextWorkout));

composer.callbackQuery('/next_workout', userHasEnoughWorkouts, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.conversation.enter('handleNextWorkout');  
});
composer.command('next_workout', userHasEnoughWorkouts, async (ctx) =>
  ctx.conversation.enter('handleNextWorkout')
);

export default composer;
