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

export async function promptUser(
	ctx: MyContext,
	conversation: MyConversation,
	validatorFunc: (input: string) => boolean,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
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
	return promptUser(ctx, conversation, validatorFunc, chat_id, message_id, message + errorMsg, options);
}

export async function promptUserForWeight(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	return promptUser(ctx, conversation, validateWeight, chat_id, message_id, message, options);
}

export async function promptUserForRepetitions(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	return promptUser(ctx, conversation, validateReps, chat_id, message_id, message, options);
}

export async function promptUserForRPE(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	message_id: number,
	message: string,
	options: any): Promise<number> {
	return promptUser(ctx, conversation, validateRPE, chat_id, message_id, message, options);
}
