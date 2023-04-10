import {type MyContext, type MyConversation} from 'types/bot';

export function validateWeight(input: string): boolean {
	const parsedInput = parseFloat(input.toString());

	return parsedInput >= 1 && parsedInput <= 999 && !isNaN(parsedInput);
}

export function validateReps(input: string): boolean {
	const parsedInput = parseInt(input.toString(), 10);

	return Number.isInteger(parsedInput) && parsedInput >= 1 && parsedInput <= 999 && !isNaN(parsedInput);
}

export function validateRPE(input: string): boolean {
	const floatValue = parseFloat(input.toString());
	if (isNaN(floatValue)) {
		return false;
	}

	return floatValue >= 6.0 && floatValue <= 10.0 && floatValue % 0.5 === 0;
}

export function validateExerciseName(exerciseName: string): boolean {
	if (!exerciseName || exerciseName.trim().length > 50) {
		return false;
	}

	const regex = /^[a-zA-Z0-9\s'".!?()_-]+$/;
	if (!regex.test(exerciseName.trim())) {
		return false;
	}

	return true;
}

export function validateYesNoInput(input: string): boolean {
	const normalizedInput = input.toLowerCase().trim();
	return normalizedInput === 'yes' || normalizedInput === 'no';
}

export async function promptUserForNumber(
	ctx: MyContext,
	conversation: MyConversation,
	validatorFunc: (input: string) => boolean,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
	await ctx.api.editMessageText(chat_id, message_id, message, options);

	ctx = await conversation.waitFor(['message:text', 'callback_query:data']);

	if (ctx.callbackQuery) {
		return Number(ctx.callbackQuery.data);
	}

	await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id);

	const isInputValid = validatorFunc(ctx.message!.text!);

	if (isInputValid && typeof ctx.message!.text !== 'undefined') {
		return Number(ctx.message!.text);
	}

	const errorMsg = `\n\n❌ <b>Must be a number! Try again</b>\n${new Date().toLocaleTimeString()}`;
	return promptUserForNumber(ctx, conversation, validatorFunc, chat_id, message_id, message + errorMsg, options);
}

export async function promptUserForText(
	ctx: MyContext,
	conversation: MyConversation,
	validatorFunc: (input: string) => boolean,
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

	const isInputValid = validatorFunc(ctx.message!.text!);

	if (isInputValid && typeof ctx.message!.text !== 'undefined') {
		return ctx.message!.text;
	}

	const errorMsg = `\n\n❌ <b>Invalid text input! Try again</b>\n${new Date().toLocaleTimeString()}`;
	return promptUserForText(ctx, conversation, validatorFunc, chat_id, message_id, message + errorMsg, options);
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
