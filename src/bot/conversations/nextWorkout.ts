import {
  InlineKeyboardOptions,
  generateExerciseOptions,
  getYesNoOptions,
} from "@/bot/config/keyboards.js";
import {
  getWorkoutTitleMessage,
  successMessages,
} from "@/bot/helpers/messages.js";
import {
  promptUserForPredefinedString,
  promptUserForYesNo,
} from "@/bot/helpers/prompts.js";
import {
  generateSetCountMap,
  renderWorkoutStatsMessage,
} from "@/bot/helpers/workoutStats.js";
import {
  RecordExerciseParams,
  determineIsDeload,
  getSetData,
} from "@/bot/helpers/workoutUtils.js";
import { createOrUpdateUserWorkout } from "@/bot/models/user.js";
import { WorkoutType } from "@/bot/models/workout.js";
import { MyContext, MyConversation } from "@/bot/types/bot.js";
import { createConversation } from "@grammyjs/conversations";
import { isSameDay } from "date-fns/isSameDay";
import { isToday } from "date-fns/isToday";

export const NEXT_WORKOUT_CONVERSATION = "nextWorkout";

export function nextWorkoutConversation() {
  return createConversation(async function (
    conversation: MyConversation,
    ctx: MyContext,
  ) {
    const { id: chat_id } = ctx.chat;
    let isFinished = false;
    let iteration = 1;

    while (!isFinished) {
      try {
        const { settings: userSettings, recentWorkouts } = ctx.dbchat;
        const weightUnit = userSettings.isMetric ? "kg" : "lb";
        const lastWorkout = recentWorkouts[0]!;
        const isTodayWorkout = isToday(lastWorkout.createdAt);

        const determineIsDeloadResult = await determineIsDeload(
          ctx,
          conversation,
          {
            cmdPrefix: NEXT_WORKOUT_CONVERSATION,
            iteration,
          },
        );

        if (!determineIsDeloadResult) {
          return;
        }

        const { isDeload, ctx: updatedContext } = determineIsDeloadResult;

        ctx = updatedContext;

        if (isDeload === undefined) {
          await ctx.deleteMessage();
          return;
        }

        const workoutCount = getWorkoutCount(recentWorkouts, isTodayWorkout);
        const previousWorkout = getPreviousWorkout(
          recentWorkouts,
          userSettings.splitLength,
        )!;
        const previousWorkoutExercises = [
          ...new Set(previousWorkout.sets.map((set) => set.exercise)),
        ];

        const setCountMap = isTodayWorkout
          ? generateSetCountMap(lastWorkout?.sets)
          : {};

        const todaysExercises = generateExerciseOptions(
          previousWorkoutExercises,
          setCountMap,
          NEXT_WORKOUT_CONVERSATION,
        );
        const options: InlineKeyboardOptions = {
          reply_markup: todaysExercises,
          parse_mode: "HTML",
        };
        const promptForExerciseResult = await promptUserForPredefinedString(
          ctx,
          conversation,
          chat_id,
          conversation.session.state.lastMessageId,
          getWorkoutTitleMessage(workoutCount),
          options,
          previousWorkoutExercises,
        );

        if (promptForExerciseResult === undefined) {
          return;
        }

        const selectedExercise = promptForExerciseResult.data;
        ctx = promptForExerciseResult.context;

        if (selectedExercise === undefined) {
          await ctx.deleteMessage();
          return;
        }

        const exerciseData = getExerciseData(selectedExercise, previousWorkout);

        if (!exerciseData) {
          throw new Error("No data found for this exercise");
        }

        const exerciseParams: RecordExerciseParams = {
          selectedExercise,
          weightUnit,
          setCount: setCountMap[selectedExercise],
          ...exerciseData,
        };

        const getSetDataResult = await getSetData(
          conversation,
          ctx,
          chat_id,
          conversation.session.state.lastMessageId,
          exerciseParams,
        );

        if (getSetDataResult === undefined) {
          iteration += 1;
          continue;
        }

        const setData = getSetDataResult.data;
        ctx = getSetDataResult.newContext;

        const updatedCurrentWorkout = await conversation.external(() =>
          createOrUpdateUserWorkout(ctx.dbchat.user_id, setData, isDeload),
        );

        const continueWorkoutResult = await promptUserForYesNo(
          ctx,
          conversation,
          chat_id,
          ctx.session.state.lastMessageId,
          successMessages.onRecordSetSuccess,
          {
            reply_markup: getYesNoOptions(NEXT_WORKOUT_CONVERSATION),
            parse_mode: "HTML",
          },
        );

        if (!continueWorkoutResult) {
          return;
        }

        const continueWorkout = continueWorkoutResult.data;
        ctx = continueWorkoutResult.context;

        if (continueWorkout === "yes") {
          iteration += 1;
          continue;
        }

        isFinished = true;

        await ctx.editMessageText(
          renderWorkoutStatsMessage(ctx, updatedCurrentWorkout!, workoutCount),
          { parse_mode: "HTML" },
        );
      } catch (err: unknown) {
        console.log(err);
      }
    }
  }, NEXT_WORKOUT_CONVERSATION);
}

// previousWorkout here is the last workout of the same type
// assuming a trainee follows a 4 day split with workouts A, B, C, D and they repeat in a cyclical manner
// if we're currently on workout D (in squiggly brackets), then the last workout would be ... last -> [D], A, B, C, {D} <- current
function getPreviousWorkout(
  recentWorkouts: WorkoutType[],
  splitLength: number,
) {
  const isSameWorkout = isSameDay(recentWorkouts[0]!.createdAt, new Date());
  let workoutNumber = splitLength - 1;

  if (isSameWorkout) {
    workoutNumber += 1;
  }

  if (workoutNumber === splitLength - 1) {
    return recentWorkouts[workoutNumber];
  }

  return recentWorkouts[workoutNumber];
}

// should update exercise data based on whether it's a deload or not
function getExerciseData(
  selectedExercise: string,
  previousWorkout: WorkoutType,
) {
  const allSets = previousWorkout.sets.filter(
    (set) => set.exercise === selectedExercise,
  );

  if (allSets.length === 0) {
    return null;
  }

  const numberOfSets = allSets.length;
  const { weight: previousWeight, repetitions: previousReps } = allSets[0]!;
  const hitAllReps = allSets.every((set) => set.repetitions >= previousReps);

  return { previousWeight, previousReps, numberOfSets, hitAllReps };
}

// count num of workouts since the start of meso (startOfMeso = first session after the deload)
const getWorkoutCount = (workouts: WorkoutType[], isTodayWorkout: boolean) => {
  // if deloadWorkout found => start count from the next workout
  const deloadIndex = workouts.findIndex((w) => w.isDeload);

  // otherwise start count from the start of the array
  let count;

  if (deloadIndex === -1) {
    count = isTodayWorkout ? workouts.length : workouts.length + 1;
  } else {
    count = isTodayWorkout ? deloadIndex : deloadIndex + 1;
  }

  return count;
};
