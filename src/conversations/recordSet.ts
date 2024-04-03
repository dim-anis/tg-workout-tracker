import {
  InlineKeyboardOptions,
  getMenuFromStringArray,
  getYesNoOptions,
} from "@/config/keyboards.js";
import { successMessages } from "@/helpers/messages.js";
import {
  promptUserForPredefinedString,
  promptUserForYesNo,
} from "@/helpers/prompts.js";
import {
  RecordExerciseParams,
  determineIsDeload,
  getSetData,
} from "@/helpers/workoutUtils.js";
import { ExerciseType } from "@/models/exercise.js";
import { createOrUpdateUserWorkout } from "@/models/user.js";
import { MyContext, MyConversation } from "@/types/bot.js";
import { createConversation } from "@grammyjs/conversations";

export const RECORD_SET_CONVERSATION = "recordSet";

export function recordSetConversation() {
  return createConversation(
    async (conversation: MyConversation, ctx: MyContext) => {
      if (!ctx.chat) {
        return;
      }

      try {
        let isFinished = false;
        let iteration = 1;
        const { user_id, exercises } = ctx.dbchat;
        const { isMetric } = ctx.dbchat.settings;
        const weightUnit = isMetric ? "kg" : "lb";
        const { id: chat_id } = ctx.chat;

        const categories = new Set(
          exercises.map((exercise) => exercise.category),
        );
        const exercisesByCategory = getExercisesByCategory(exercises);

        const result = await determineIsDeload(ctx, conversation, {
          cmdPrefix: RECORD_SET_CONVERSATION,
          iteration,
        });

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
            exercisesByCategory,
          );

          if (selectedExercise === undefined) {
            return;
          }

          const exerciseParams: RecordExerciseParams = {
            selectedExercise,
            weightUnit,
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

          await conversation.external(
            async () =>
              await createOrUpdateUserWorkout(user_id, setData, isDeload),
          );

          const continueWorkoutResult = await promptUserForYesNo(
            ctx,
            conversation,
            chat_id,
            ctx.session.state.lastMessageId,
            successMessages.onRecordSetSuccess,
            {
              reply_markup: getYesNoOptions(RECORD_SET_CONVERSATION),
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
        }

        await ctx.deleteMessage();
      } catch (err: unknown) {
        console.log(err);
      }
    },
    RECORD_SET_CONVERSATION,
  );
}

async function chooseExercise(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  categories: Set<string>,
  exercisesByCategory: Map<string, string[]>,
): Promise<string | undefined> {
  const cmdTitle = "<b>Record exercise</b>";
  const chooseCategoryText = cmdTitle + "\n\n<i>Choose a category:</i>";
  const chooseCategoryOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray(
      [...categories],
      RECORD_SET_CONVERSATION,
      {
        addBackButton: true,
      },
    ),
    parse_mode: "HTML",
  };

  const backButtonCbData = `${RECORD_SET_CONVERSATION}:goBack`;

  const promptForCategoryResult = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseCategoryText,
    chooseCategoryOptions,
    [...categories, backButtonCbData],
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

  const chooseExerciseText =
    cmdTitle + ` > <b>${category}</b>\n\n<i>Choose an exercise:</i>`;
  const chooseExerciseOptions: InlineKeyboardOptions = {
    reply_markup: getMenuFromStringArray(
      exercisesByCategory.get(category) as string[],
      RECORD_SET_CONVERSATION,
      { addBackButton: true },
    ),
    parse_mode: "HTML",
  };

  const promptForExerciseResult = await promptUserForPredefinedString(
    ctx,
    conversation,
    chat_id,
    conversation.session.state.lastMessageId,
    chooseExerciseText,
    chooseExerciseOptions,
    [...(exercisesByCategory.get(category) as string[]), backButtonCbData],
  );

  if (!promptForExerciseResult) {
    return "";
  }

  const exercise = promptForExerciseResult.data;
  ctx = promptForExerciseResult.context;

  if (exercise === undefined) {
    return chooseExercise(
      ctx,
      conversation,
      chat_id,
      categories,
      exercisesByCategory,
    );
  }

  return exercise;
}

function getExercisesByCategory(exercises: ExerciseType[]) {
  const exercisesByCategory = new Map<string, string[]>();
  return exercises.reduce((result, current) => {
    if (!result.get(current.category)) {
      result.set(current.category, [current.name]);
    } else {
      result.set(current.category, [
        ...(result.get(current.category) as string[]),
        current.name,
      ]);
    }
    return result;
  }, exercisesByCategory);
}
