import {type MyContext, type MyConversation} from '../../types/bot';

export default async function waitForTextAndRemove(conversation: MyConversation, ctx: MyContext) {
	if (!ctx.chat) {
		return;
	}

	const {msg: {text, message_id}} = await conversation.waitFor('message:text');
	await ctx.api.deleteMessage(ctx.chat.id, message_id);
	return text;
}
