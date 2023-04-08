import {type MyContext, type MyConversation} from 'types/bot';

function isNumber(str: string): boolean {
	const num = parseFloat(str);
	return !isNaN(num);
}

export async function promptNumberWithRetry(ctx: MyContext, conversation: MyConversation, chat_id: number, promptText: string): Promise<number> {
	await ctx.api.editMessageText(chat_id, ctx.session.state.lastMessageId, promptText, {parse_mode: 'HTML'});

	const {message: {message_id, text: input}} = await conversation.waitFor('message:text');
	await ctx.api.deleteMessage(chat_id, message_id);

	if (isNumber(input)) {
		return parseFloat(input);
	}

	const errorMsg = `\n\n❌ <b>Must be a number! Try again</b>\n${new Date().toLocaleTimeString()}`;
	return promptNumberWithRetry(ctx, conversation, chat_id, promptText + errorMsg);
}
