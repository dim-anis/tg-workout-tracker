import {type MyContext, type MyConversation} from 'types/bot';

const errorMessages = {
	input_is_not_yes_or_no: '\n\n❌ <b>Input must be "Yes" or "No"</b>',
	input_too_long: '\n\n❌ <b>Input is too long. Max length is 50 characters</b>',
	input_contains_special_chars: 'Input contains special characters. Only alphanumeric characters are allowed',
	input_is_not_a_number: '\n\n❌ <b>Input must be a number</b>',
	input_is_out_of_range_weight: '\n\n❌ <b>Input is out of range. Must be between 1 and 999</b>',
	input_is_out_of_range_rpe: '\n\n❌ <b>Input is out of range. Must be between 6.0 and 10.0</b>',
	input_is_out_of_range_repetitions: '\n\n❌ <b>Input is out of range. Must be between 1 and 99</b>',
	input_is_not_a_multiple_of_half: '\n\n❌ <b>Input must be a multiple of 0.5 (5.5, 6, 6.5, etc.)/b>',
	input_is_not_an_integer: '\n\n❌ <b>Input must be an integer</b>\n',
};

function updateMessageWithError(message: string, error = '') {
	const existingErrorMessages = message.split('\n\n').filter(msg => msg.startsWith('❌'));
	const timestamp = new Date().toLocaleTimeString();
	const errorMsg = error ? errorMessages[error as keyof typeof errorMessages] + '\n' + timestamp : '';
	const newMessage = existingErrorMessages.length > 0 ? message.replace('\n\n' + existingErrorMessages.join('\n\n'), errorMsg) : message + errorMsg;

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

export async function promptUserForNumber(
	ctx: MyContext,
	conversation: MyConversation,
	validatorFunc: (input: string) => string | undefined,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	await ctx.api.editMessageText(chat_id, message_id, message, options);

	ctx = await conversation.waitFor(['message:text', 'callback_query:data']);

	if (ctx.callbackQuery) {
		const value = ctx.callbackQuery.data?.split(':')[1];
		return Number(value);
	}

	await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id);

	const validationError = validatorFunc(ctx.message!.text!);

	if (!validationError && typeof ctx.message!.text !== 'undefined') {
		return Number(ctx.message!.text);
	}

	const newMessage = updateMessageWithError(message, validationError);
	return promptUserForNumber(ctx, conversation, validatorFunc, chat_id, message_id, newMessage, options);
}

export async function promptUserForText(
	ctx: MyContext,
	conversation: MyConversation,
	validatorFunc: (input: string) => string | undefined,
	chat_id: number,
	message_id: number,
	message: string,
	options: any,
): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	const result = await ctx.api.editMessageText(chat_id, message_id, message, options);

	ctx = await conversation.waitFor(['message:text', 'callback_query:data']);

	if (ctx.callbackQuery) {
		return ctx.callbackQuery.data!;
	}

	await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id);

	const validationError = validatorFunc(ctx.message!.text!);

	if (!validationError && typeof ctx.message!.text !== 'undefined') {
		return ctx.message!.text;
	}

	const newMessage = updateMessageWithError(message, validationError);
	return promptUserForText(ctx, conversation, validatorFunc, chat_id, message_id, newMessage, options);
}

export async function promptUserForWeight(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	return promptUserForNumber(ctx, conversation, validateWeight, chat_id, message_id, message, options);
}

export async function promptUserForRepetitions(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	return promptUserForNumber(ctx, conversation, validateReps, chat_id, message_id, message, options);
}

export async function promptUserForRPE(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	return promptUserForNumber(ctx, conversation, validateRPE, chat_id, message_id, message, options);
}

export async function promptUserForExerciseName(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<string> {
	return promptUserForText(ctx, conversation, validateExerciseName, chat_id, message_id, message, options);
}

export async function promptUserForYesNo(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any,
): Promise<string> {
	return promptUserForText(ctx, conversation, validateYesNoInput, chat_id, message_id, message, options);
}
