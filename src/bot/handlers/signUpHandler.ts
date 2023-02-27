import {updateUser} from '../api/users';
import {type MyContext} from 'bot/types/bot';
import {type MyConversation} from 'bot/types/bot';
import {InlineKeyboard} from 'grammy';
import {getNumberRange} from '../config/keyboards';

const handleSignUp = async (conversation: MyConversation, ctx: MyContext) => {
	const {user_id} = ctx.dbchat;
	const chat_id = ctx.chat?.id;

	if (!chat_id) {
		return;
	}

	const defaultName = ctx.from?.first_name;
	if (defaultName) {
		const message = await ctx.reply(
			`Hey, ${defaultName}!\n\nLooks like it's your first time here. I must ask you a couple of questions before we continue.`,
			{reply_markup: new InlineKeyboard().text('Cancel', 'cancel').text('Next', 'next')},
		);

		const cbCtxMain = await conversation.waitForCallbackQuery(['cancel', 'next']);

		const {data} = cbCtxMain.callbackQuery;

		if (data === 'next') {
			await ctx.api.editMessageText(
				chat_id,
				message.message_id,
				'<b>1/2 What is your current split length?</b>\n\n<i>Choose a number below:</i>',
				{parse_mode: 'HTML', reply_markup: await getNumberRange(7)},
			);

			const cbCtxSplitLength = await conversation.waitForCallbackQuery(/[1-7]/);
			const {data: splitLength} = cbCtxSplitLength.callbackQuery;

			await ctx.api.editMessageText(
				chat_id,
				message.message_id,
				'<b>2/2 Are you using kgs or lbs?</b>\n\nChoose a unit below:',
				{parse_mode: 'HTML', reply_markup: new InlineKeyboard().text('lbs').text('kgs')},
			);

			const cbCtxUnit = await conversation.waitForCallbackQuery(['kgs', 'lbs']);
			const {data: unit} = cbCtxUnit.callbackQuery;

			const payload = JSON.stringify({splitLength, unit, user_id});
			const response = await conversation.external(async () => updateUser(ctx.dbchat.user_id, payload));
			if (response.data) {
				await ctx.api.editMessageText(
					chat_id,
					message.message_id,
					'<b>Done!</b>\n\n<i>You can change these settings at any time. Open settings menu by using command /settings</i>',
					{parse_mode: 'HTML'},
				);
			}

			return;
		}

		await ctx.reply('No problem! Until next time!');
	}
};

export {handleSignUp};
