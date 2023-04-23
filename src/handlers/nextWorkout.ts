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
  promptUserForYesNo
} from './helpers/promptUser.js';
import { getCompletedSetsString } from './helpers/calculateSetData.js';
import { successMessages } from './helpers/successMessages.js';

const composer = new Composer<MyContext>();

const handleNextWorkout = async (
  conversation: MyConversation,
  ctx: MyContext
) => {
  if (!ctx.chat) {
    return;
  }

  const { id: chat_id } = ctx.chat;
  const { splitLength } = ctx.dbchat.settings;
  const { recentWorkouts } = ctx.dbchat;

  try {
    const isDeload = isToday(ctx.dbchat.recentWorkouts[0].createdAt)
      ? ctx.dbchat.recentWorkouts[0].isDeload
      : await isDeloadWorkout(ctx, conversation);
    const workoutCount = calculateWorkoutCount(recentWorkouts);
    const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength);
    const previousWorkoutExercises = [
      ...new Set(previousWorkout.sets.map((set) => set.exercise))
    ];
    const workoutTitle = `<b>Workout #${workoutCount} of Current Mesocycle</b>\n\n<i>Select an exercise:</i>`;
    let updatedCurrentWorkout: WorkoutType | Record<string, never> = {};
    let workoutFinished = false;

    do {
      const mostRecentWorkout = ctx.dbchat.recentWorkouts[0];
      conversation.log(mostRecentWorkout);
      const isTodayWorkout = isSameDay(mostRecentWorkout.createdAt, Date.now());
      const setCountMap = isTodayWorkout
        ? countSets(mostRecentWorkout.sets)
        : {};

      const exerciseOptions = new InlineKeyboard();

      for (const exerciseName of previousWorkoutExercises) {
        const numberOfCompletedSets = setCountMap[exerciseName];
        const buttonLabel = `${exerciseName} ${getCompletedSetsString(
          numberOfCompletedSets
        )}`;

        exerciseOptions.text(buttonLabel, exerciseName).row();
      }

      //const { lastMessageId } = conversation.session.state;

      // await ctx.api.editMessageText(chat_id, lastMessageId, workoutTitle, {
      //   reply_markup: exerciseOptions,
      //   parse_mode: 'HTML'
      // });

      const { message_id } = await ctx.reply(workoutTitle, {
        reply_markup: exerciseOptions,
        parse_mode: 'HTML'
      });

      conversation.session.state.lastMessageId = message_id;
      const { lastMessageId } = conversation.session.state;

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

      const { previousWeight, previousReps, hitAllReps } =
        previousWorkoutSetData;

      const exerciseParams = {
        selectedExercise,
        previousWeight,
        previousReps,
        hitAllReps
      };

      updatedCurrentWorkout = await recordExercise(
        conversation,
        ctx,
        chat_id,
        lastMessageId,
        exerciseParams,
        isDeload
      );

      const finishWorkoutText = 'Would you like to finish this workout?';
      const finishWorkoutOptions = {
        reply_markup: await getYesNoOptions('nextWorkout')
      };
      const finishWorkout = await promptUserForYesNo(
        ctx,
        conversation,
        chat_id,
        lastMessageId,
        finishWorkoutText,
        finishWorkoutOptions
      );

      workoutFinished = finishWorkout === 'yes';
    } while (!workoutFinished);

    const workoutStatsText = getWorkoutStatsText(
      updatedCurrentWorkout,
      workoutCount
    );
    await ctx.api.editMessageText(
      chat_id,
      conversation.session.state.lastMessageId,
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
    reply_markup: await getWeightOptions(previousWeight, 'nextWorkout'),
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
    reply_markup: await getRepOptions(previousReps, 'nextWorkout'),
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
    reply_markup: await getRpeOptions('nextWorkout'),
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

  const updatedWorkout = await conversation.external(async () =>
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

async function recordExercise(
  conversation: MyConversation,
  ctx: MyContext,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
  isDeload: boolean
): Promise<WorkoutType> {
  const { selectedExercise } = exerciseParams;

  let stopRecording = false;
  let updatedWorkout;
  let setCount = 0;

  do {
    updatedWorkout = await recordSet(
      conversation,
      ctx,
      chat_id,
      message_id,
      exerciseParams,
      setCount,
      isDeload
    );

    if (typeof updatedWorkout === 'undefined') {
      throw new Error('Failed to record set to DB!');
    }

    setCount = countSets(updatedWorkout.sets)[selectedExercise];
    const lastRecordedSet = updatedWorkout.sets[updatedWorkout.sets.length - 1];
    const { weight, repetitions, rpe } = lastRecordedSet;

    const successText =
      `<b>${selectedExercise} ${getCompletedSetsString(setCount)}</b>\n\n` +
      `${weight} kgs x ${repetitions} @ ${rpe}RPE\n\n` +
      successMessages.onRecordSetSuccess;
    const successOptions = {
      reply_markup: await getYesNoOptions('nextWorkout'),
      parse_mode: 'HTML'
    };
    const recordOneMoreSet = await promptUserForYesNo(
      ctx,
      conversation,
      chat_id,
      message_id,
      successText,
      successOptions
    );

    stopRecording = recordOneMoreSet === 'no';
  } while (!stopRecording);

  return updatedWorkout;
}

function getPreviousWorkout(
  recentWorkouts: WorkoutType[],
  splitLength: number
) {
  const isSameWorkout = isSameDay(recentWorkouts[0].createdAt, new Date());
  let workoutNumber = splitLength - 1;
  const workoutCandidate = recentWorkouts[workoutNumber];

  if (workoutCandidate.isDeload) {
    workoutNumber = recentWorkouts.findIndex((workout) => !workout.isDeload);
    workoutNumber = workoutNumber === -1 ? splitLength - 1 : workoutNumber;
  }

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

const calculateWorkoutCount = (workouts: WorkoutType[]) => {
  const deloadIndex = workouts.findIndex((w) => w.isDeload);
  const latestWorkoutDate = workouts[0]?.createdAt;
  const today = new Date();

  if (latestWorkoutDate && isSameDay(latestWorkoutDate, today)) {
    return deloadIndex === -1
      ? workouts.length
      : workouts.slice(0, deloadIndex).length;
  } else {
    return deloadIndex === -1
      ? workouts.length + 1
      : workouts.slice(0, deloadIndex).length + 1;
  }
};

export async function isDeloadWorkout(
  ctx: MyContext,
  conversation: MyConversation
) {
  const { message_id } = await ctx.reply('Is it a <b>deload workout</b>?', {
    parse_mode: 'HTML',
    reply_markup: await getYesNoOptions('nextWorkout')
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

composer.use(createConversation(handleNextWorkout));

composer.callbackQuery('/next_workout', userHasEnoughWorkouts, async (ctx) =>
  ctx.conversation.enter('handleNextWorkout')
);
composer.command('next_workout', userHasEnoughWorkouts, async (ctx) =>
  ctx.conversation.enter('handleNextWorkout')
);

export default composer;
