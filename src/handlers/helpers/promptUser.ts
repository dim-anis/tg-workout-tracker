import { type MyContext, type MyConversation } from 'types/bot.js';
import { getRepOptions, getRpeOptions, getWeightOptions, type InlineKeyboardOptions } from '../../config/keyboards.js';
import { getCompletedSetsString } from './calculateSetData.js';
import { type RecordExerciseParams } from 'handlers/nextWorkout.js';
import { getYesNoOptions } from '../../config/keyboards.js';
import { getRPEText, getRepetitionsText, getRecordWeightMessage as getRecordWeightMessage } from './successMessages.js';
import { fromLbToKgRounded } from './unitConverters.js';

const errorMessages = {
  input_is_not_yes_or_no: '\n\n❌ <b>Input must be "Yes" or "No".</b>',
  input_too_long:
    '\n\n❌ <b>Input is too long. Max length is 50 characters.</b>',
  input_contains_special_chars:
    '\n\n❌ Input contains special characters. Only alphanumeric characters are allowed.',
  input_is_not_a_number: '\n\n❌ <b>Input must be a number.</b>',
  input_is_out_of_range_weight:
    '\n\n❌ <b>Input is out of range. Must be between 1 and 999.</b>',
  input_is_out_of_range_rpe:
    '\n\n❌ <b>Input is out of range. Must be between 6.0 and 10.0.</b>',
  input_is_out_of_range_repetitions:
    '\n\n❌ <b>Input is out of range. Must be between 1 and 99.</b>',
  input_is_not_a_multiple_of_half:
    '\n\n❌ <b>Input must be a multiple of 0.5 (5.5, 6, 6.5, etc.)./b>',
  input_is_not_an_integer: '\n\n❌ <b>Input must be an integer.</b>\n',
  input_is_not_defined: "\n\n❌ <b>Input isn't one of the given options.</b>\n"
};

function updateMessageWithError(message: string, error = '') {
  const existingErrorMessages = message
    .split('\n\n')
    .filter((msg) => msg.startsWith('❌'));
  const timestamp = new Date().toLocaleTimeString();
  const errorMsg = error
    ? errorMessages[error as keyof typeof errorMessages] + '\n' + timestamp
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
): Promise<number> {
  await ctx.api.editMessageText(chat_id, message_id, message, options);

  ctx = await conversation.waitFor(['message:text', 'callback_query:data']);

  if (ctx.callbackQuery) {
    const callbackData = ctx.callbackQuery.data?.split(':')[1];
    if (callbackData && callbackData.startsWith('toggle_unit')) {
      const currUnit = callbackData.split('~')[1];

      const { selectedExercise, previousWeight, hitAllReps, setCount } = exerciseParams;
      if (previousWeight === undefined || hitAllReps === undefined) {
        return NaN;
      }

      const completedSets = getCompletedSetsString(setCount);
      const updatedOptions: InlineKeyboardOptions = {
        parse_mode: 'HTML',
        reply_markup: getWeightOptions(previousWeight, 'nextWorkout', currUnit !== 'kg'),
      };
      const updatedMessage = getRecordWeightMessage(selectedExercise, completedSets, previousWeight, hitAllReps, currUnit === 'kg' ? 'lb' : 'kg');

      return promptUserForNumber(
        ctx,
        conversation,
        validatorFunc,
        chat_id,
        message_id,
        exerciseParams,
        updatedMessage,
        updatedOptions,
        unit === 'kg' ? 'lb' : 'kg'
      )
    }

    return Number(callbackData);
  }

  if (!ctx.chat || !ctx.message?.text) {
    return NaN;
  }

  await ctx.api.deleteMessage(ctx.chat.id, ctx.message.message_id);

  const validationError = validatorFunc(ctx.message.text);

  if (!validationError) {
    const value = Number(ctx.message.text);
    if (unit) {
      const weight = unit === 'kg' ? value : fromLbToKgRounded(value);
      return weight;
    } else {
      return value;
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

export async function promptUserForText(
  ctx: MyContext,
  conversation: MyConversation,
  validatorFunc: (input: string) => string | undefined,
  chat_id: number,
  message_id: number,
  message: string,
  options: InlineKeyboardOptions
): Promise<string> {
  await ctx.api.editMessageText(chat_id, message_id, message, options);

  ctx = await conversation.waitFor(['message:text', 'callback_query:data']);

  if (ctx.callbackQuery?.data) {
    let value = ctx.callbackQuery.data.split(':')[1];
    // callback data doesn't contain prefix
    if (typeof value === 'undefined') {
      value = ctx.callbackQuery.data;
    }
    return value;
  }

  await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id);

  const validationError = validatorFunc(ctx.message!.text!);

  if (!validationError && typeof ctx.message!.text !== 'undefined') {
    return ctx.message!.text;
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
): Promise<number> {
  const { isMetric } = ctx.dbchat.settings;
  const unit = isMetric ? 'kg' : 'lb';
  const { selectedExercise, previousWeight, hitAllReps, setCount } = exerciseParams;
  let options: InlineKeyboardOptions = {
    parse_mode: 'HTML',
  };
  let message: string;

  if (previousWeight !== undefined && hitAllReps !== undefined) {
    const completedSets = getCompletedSetsString(setCount);
    message = getRecordWeightMessage(selectedExercise, completedSets, previousWeight, hitAllReps, unit);
    options = {
      ...options,
      reply_markup: getWeightOptions(previousWeight, 'nextWorkout', isMetric),
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
  currWeight: number
): Promise<number> {
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
  currWeight: number,
  currReps: number
): Promise<number> {
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
): Promise<string> {
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
): Promise<string> {
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
): Promise<string> {
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

export async function isDeloadWorkout(
  ctx: MyContext,
  conversation: MyConversation,
  commandName: string
) {
  await ctx.reply('Is it a <b>deload workout</b>?', {
    parse_mode: 'HTML',
    reply_markup: getYesNoOptions(commandName)
  });

  const {
    callbackQuery: { data }
  } = await conversation.waitForCallbackQuery([
    `${commandName}:yes`,
    `${commandName}:no`
  ]);

  return data.split(':')[1] === 'yes' ? true : false;
}
