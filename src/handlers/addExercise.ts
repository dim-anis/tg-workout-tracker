import {Composer, InlineKeyboard} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getYesNoOptions} from '../config/keyboards';
import {createUserExercise} from '../models/user';
import waitForTextAndRemove from './helpers/waitForTextAndRemove';

const composer = new Composer<MyContext>();

async function handleEditExercises(conversation: MyConversation, ctx: MyContext) {
	if (!ctx.chat) {
		return;
	}

	const {user_id} = ctx.dbchat;

	try {
		await ctx.reply(
			'<b>ADD NEW EXERCISE</b>\n\nType in the name:',
			{
				parse_mode: 'HTML',
			});

		const name = await waitForTextAndRemove(conversation, ctx);

		if (!name) {
			return;
		}

		await ctx.editMessageText(
			`<b>ADD ${name.toUpperCase()}</b>\n\nIs it a compound exercise?\n\n<i>*Involving two or more joints at once, think heavy exercises like squats, bench press etc.</i>`,
			{
				parse_mode: 'HTML',
				reply_markup: await getYesNoOptions(),
			},
		);

		const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(['yesOption', 'noOption']);

		let is_compound: boolean;
		if (data === 'yesOption') {
			is_compound = true;
		} else {
			is_compound = false;
		}

		await ctx.editMessageText(
			`<b>ADD ${name.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`,
			{
				parse_mode: 'HTML',
				reply_markup: new InlineKeyboard().text('Legs').row().text('Chest').row().text('Back'),
			},
		);

		const {callbackQuery: {data: category}} = await conversation.waitForCallbackQuery(['Chest', 'Legs', 'Back']);

		const createdExercise = await conversation.external(async () => createUserExercise(
			user_id,
			{name, category, is_compound},
		));

		if (!createdExercise) {
			throw new Error('Failed to create exercise');
		}

		await ctx.editMessageText(
			`You've added <b>${name.toUpperCase()}</b> to your exercise list!`,
			{
				parse_mode: 'HTML',
			},
		);
	} catch (e) {
		console.log(e);
	}
}

composer
	.use(createConversation(handleEditExercises));

composer.command('addExercise', async ctx => {
	await ctx.conversation.enter('handleEditExercises');
});

export default composer;
