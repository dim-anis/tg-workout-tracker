import {InlineKeyboard, type NextFunction} from 'grammy';
import {type MyContext} from 'types/bot';

export async function isNotInConversation(ctx: MyContext, next: NextFunction) {
	const activeConversations = await ctx.conversation.active();
	const numberOfActiveConversations = Object.keys(activeConversations).length;

	if (numberOfActiveConversations === 0) {
		await next();
		return;
	}

	await ctx.reply('You are in the middle of something. Would you like cancel the current conversation?', {
		reply_markup: new InlineKeyboard().text('No').text('Yes'),
		parse_mode: 'HTML',
	});
}
