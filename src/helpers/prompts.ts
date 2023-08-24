import { type MyContext, type MyConversation } from '@/types/bot.js';
import { getCompletedSetsString } from './workoutStats.js';
import { RecordExerciseParams } from './workoutUtils.js';
import { kgs } from './units.js';
import {
  getYesNoOptions,
  backButton,
  getRepOptions,
  getRpeOptions,
  getWeightOptions,
  type InlineKeyboardOptions
} from '@/config/keyboards.js';
import {
  validationErrors,
  getRPEText,
  getRepetitionsText,
  getRecordWeightMessage as getRecordWeightMessage
} from './messages.js';

function updateMessageWithError(message: string, error = '') {
  const existingErrorMessages = message
    .split('\n\n')
    .filter((msg) => msg.startsWith('❌'));
  const timestamp = new Date().toLocaleTimeString();
  const errorMsg = error
    ? validationErrors[error as keyof typeof validationErrors] + '\n' + timestamp
    : '';
  const newMessage =
    existingErrorMessages.length > 0
      ? message.replace('\n\n' + existingErrorMessages.join('\n\n'), errorMsg)
      : message + errorMsg;

  return newMessage;
}

export function validateWeight(input: string): string | undefined {
  const parsedInput = parseFloat(input);
  if (isNaN(parsedInput)) {
    return 'input_is_not_a_number';
  }

  if (parsedInput < 1 || parsedInput > 999) {
    return 'input_is_out_of_range_weight';
  }

  return undefined;
}

export function validateReps(input: string): string | undefined {
  const parsedInput = parseInt(input, 10);
  if (isNaN(parsedInput)) {
    return 'input_is_not_a_number';
  }

  if (!Number.isInteger(parsedInput)) {
    return 'input_is_not_an_integer';
  }

  if (parsedInput < 1 || parsedInput > 99) {
    return 'input_is_out_of_range_repetitions';
  }

  return undefined;
}

export function validateRPE(input: string): string | undefined {
  const floatValue = parseFloat(input);
  if (isNaN(floatValue)) {
    return 'input_is_not_a_number';
  }

  if (floatValue < 6.0 || floatValue > 10.0) {
    return 'input_is_out_of_range_rpe';
  }

  if (floatValue % 0.5 !== 0) {
    return 'input_is_not_a_multiple_of_half';
  }

  return undefined;
}

export function validateExerciseName(input: string): string | undefined {
  if (!input || input.trim().length > 50) {
    return 'input_too_long';
  }

  const regex = /^[a-zA-Z0-9\s'".!?()_-]+$/;
  if (!regex.test(input.trim())) {
    return 'input_contains_special_chars';
  }

  return undefined;
}

export function validateYesNoInput(input: string): string | undefined {
  const normalizedInput = input.toLowerCase().trim();
  if (normalizedInput !== 'yes' && normalizedInput !== 'no') {
    return 'input_is_not_yes_or_no';
  }

  return undefined;
}

function createPredefinedStringValidator(
  validTextOptions: string[]
): (input: string) => string | undefined {
  return (input: string) => {
    if (!validTextOptions.includes(input)) {
      return 'input_is_not_defined';
    }
    return undefined;
  };
}

type NumberPromptResult = {
  data: number,
  context: MyContext
}

export async function promptUserForNumber(
  ctx: MyContext,
  conversation: MyConversation,
  validatorFunc: (input: string) => string | undefined,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
  message: string,
  options: InlineKeyboardOptions,
  unit?: 'kg' | 'lb'
): Promise<NumberPromptResult | undefined> {
  await ctx.api.editMessageText(chat_id, message_id, message, options);

  ctx = await conversation.waitFor(['message:text', 'callback_query:data']).then(ctx => ctx);

  if (ctx.callbackQuery) {
    const buttonData = ctx.callbackQuery.data?.split(':')[1];
    if (buttonData && buttonData.startsWith('toggle_unit')) {
      const currUnit = buttonData.split('~')[1];

      exerciseParams = {
        ...exerciseParams,
        weightUnit: currUnit === 'kg' ? 'lb' : 'kg'
      }

      return promptUserForWeight(
        ctx,
        conversation,
        chat_id,
        message_id,
        exerciseParams,
      )
    } else if (buttonData === 'goBack') {
      return undefined;
    }

    return { data: Number(buttonData), context: ctx };
  }

  if (!ctx.chat || !ctx.message?.text) {
    return { data: NaN, context: ctx };
  }

  await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);

  const validationError = validatorFunc(ctx.message.text);

  if (!validationError) {
    const value = Number(ctx.message.text);
    if (unit) {
      const weight = unit === 'kg' ? value : kgs(value);
      return { data: weight, context: ctx };
    } else {
      return { data: value, context: ctx };
    }
  }

  const newMessage = updateMessageWithError(message, validationError);

  return promptUserForNumber(
    ctx,
    conversation,
    validatorFunc,
    chat_id,
    message_id,
    exerciseParams,
    newMessage,
    options
  );
}

type TextPromptResult = {
  data: string | undefined,
  context: MyContext
}

export async function promptUserForText(
  ctx: MyContext,
  conversation: MyConversation,
  validatorFunc: (input: string) => string | undefined,
  chat_id: number,
  message_id: number,
  message: string,
  options: InlineKeyboardOptions
): Promise<TextPromptResult | undefined> {
  await ctx.api.editMessageText(chat_id, message_id, message, options);

  ctx = await conversation.waitFor(['message:text', 'callback_query:data']).then(ctx => ctx);

  if (ctx.callbackQuery?.data) {
    let buttonData = ctx.callbackQuery.data.split(':')[1];
    // callback data doesn't contain prefix
    if (typeof buttonData === 'undefined') {
      buttonData = ctx.callbackQuery.data;
    } else if (buttonData === 'goBack') {
      return { data: undefined, context: ctx };
    }
    return { data: buttonData, context: ctx };
  }

  if (!ctx.chat || !ctx.message?.text) {
    return;
  }

  await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);

  const validationError = validatorFunc(ctx.message.text);

  if (!validationError && typeof ctx.message.text !== 'undefined') {
    return { data: ctx.message.text, context: ctx };
  }

  const newMessage = updateMessageWithError(message, validationError);

  return promptUserForText(
    ctx,
    conversation,
    validatorFunc,
    chat_id,
    message_id,
    newMessage,
    options
  );
}

export function promptUserForWeight(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
): Promise<NumberPromptResult | undefined> {
  const { selectedExercise, previousWeight, hitAllReps, setCount, weightUnit: unit } = exerciseParams;

  let options: InlineKeyboardOptions = {
    parse_mode: 'HTML',
  };
  let message: string;

  if (previousWeight !== undefined && hitAllReps !== undefined) {
    const completedSets = getCompletedSetsString(setCount);
    message = getRecordWeightMessage(selectedExercise, completedSets, previousWeight, hitAllReps, unit);
    options = {
      ...options,
      reply_markup: getWeightOptions(previousWeight, 'nextWorkout', unit),
    };
  } else {
    message = `<b>${selectedExercise.toUpperCase()}</b>\n\nType in the weight:`;
  }

  return promptUserForNumber(
    ctx,
    conversation,
    validateWeight,
    chat_id,
    message_id,
    exerciseParams,
    message,
    options,
    unit
  );
}

export function promptUserForRepetitions(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
  currWeight?: number
): Promise<NumberPromptResult | undefined> {
  const { selectedExercise, previousReps, hitAllReps, setCount } = exerciseParams;

  let options: InlineKeyboardOptions = {
    parse_mode: 'HTML',
  };
  let message: string;

  if (previousReps !== undefined && hitAllReps !== undefined) {
    const completedSets = getCompletedSetsString(setCount);
    message = getRepetitionsText(selectedExercise, completedSets, previousReps, hitAllReps);
    options = {
      ...options,
      reply_markup: getRepOptions(previousReps, 'nextWorkout'),
    };
  } else {
    message = `<b>${selectedExercise.toUpperCase()}</b>\n\n<i>${currWeight}kgs</i>\n\nType in the repetitions:`;
  }

  return promptUserForNumber(
    ctx,
    conversation,
    validateReps,
    chat_id,
    message_id,
    exerciseParams,
    message,
    options
  );
}

export function promptUserForRPE(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  exerciseParams: RecordExerciseParams,
  currWeight?: number,
  currReps?: number
): Promise<NumberPromptResult | undefined> {
  const { selectedExercise, previousReps, hitAllReps, setCount } = exerciseParams;

  let options: InlineKeyboardOptions = {
    parse_mode: 'HTML',
  };
  let message: string;

  if (previousReps !== undefined && hitAllReps !== undefined) {
    const completedSets = getCompletedSetsString(setCount);
    message = getRPEText(selectedExercise, completedSets);
    options = {
      ...options,
      reply_markup: getRpeOptions('nextWorkout'),
    };
  } else {
    message = `<b>${selectedExercise.toUpperCase()}</b>\n\n<i>${currWeight}kgs x ${currReps}</i>\n\nChoose the RPE:`;
  }

  return promptUserForNumber(
    ctx,
    conversation,
    validateRPE,
    chat_id,
    message_id,
    exerciseParams,
    message,
    options
  );
}

export function promptUserForExerciseName(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  message: string,
  options: InlineKeyboardOptions
): Promise<TextPromptResult | undefined> {
  return promptUserForText(
    ctx,
    conversation,
    validateExerciseName,
    chat_id,
    message_id,
    message,
    options
  );
}

export function promptUserForYesNo(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  message: string,
  options: InlineKeyboardOptions
): Promise<TextPromptResult | undefined> {
  return promptUserForText(
    ctx,
    conversation,
    validateYesNoInput,
    chat_id,
    message_id,
    message,
    options
  );
}

export function promptUserForPredefinedString(
  ctx: MyContext,
  conversation: MyConversation,
  chat_id: number,
  message_id: number,
  message: string,
  options: InlineKeyboardOptions,
  validTextOptions: string[]
): Promise<TextPromptResult | undefined> {
  const validatorFunc = createPredefinedStringValidator(validTextOptions);

  return promptUserForText(
    ctx,
    conversation,
    validatorFunc,
    chat_id,
    message_id,
    message,
    options
  );
}

type IsDeloadResult = {
  data: boolean | undefined,
  context: MyContext
}

export async function isDeloadWorkout(
  ctx: MyContext,
  conversation: MyConversation,
  message_id: number,
  commandName: string,
  iteration = 1
): Promise<IsDeloadResult | undefined> {
  const chat_id = ctx.chat?.id;
  if (!chat_id) return undefined;

  const message = 'Is it a <b>deload workout</b>?';
  const keyboard = getYesNoOptions(commandName);
  keyboard.row();
  keyboard.text(backButton, `${commandName}:goBack`);

  const options: InlineKeyboardOptions = {
    parse_mode: 'HTML',
    reply_markup: keyboard
  }

  if (iteration > 1) {
    await ctx.api.editMessageText(
      chat_id,
      message_id,
      message,
      options
    );
  }
  else {
    await ctx.reply(message, options);
  }

  const [response, context] = await conversation
    .waitForCallbackQuery([
      `${commandName}:yes`,
      `${commandName}:no`,
      `${commandName}:goBack`,
    ])
    .then(ctx => [ctx.callbackQuery.data.split(':')[1], ctx] as const);

  switch (response) {
    case 'yes':
      return {
        data: true,
        context
      };
    case 'no':
      return {
        data: false,
        context
      };
    case 'goBack':
      return {
        data: undefined,
        context
      };
  }
}
