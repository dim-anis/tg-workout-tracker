import {Composer, InlineKeyboard} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getYesNoOptions} from '../config/keyboards';
import {getExercise} from './helpers/getExerciseFromInline';
import {createUserExercise, getAllUserExercises} from '../models/user';

const composer = new Composer<MyContext>();

async function handleEditExercises(conversation: MyConversation, ctx: MyContext) {
	if (!ctx.chat) {
		return;
	}

	const {id: chat_id} = ctx.chat;
	const {user_id} = ctx.dbchat;

	try {
		const editExerciseMenu = new InlineKeyboard()
			.text('Add new exercise', 'addNewExercise')
			.row()
			.text('Edit exercise list', 'editExercises');

		const {message_id} = await ctx.reply('<b>EDIT EXERCISE LIST</b>\n\nChoose an option:', {
			reply_markup: editExerciseMenu,
			parse_mode: 'HTML',
		});

		const {callbackQuery: {data: option}} = await conversation.waitForCallbackQuery(['addNewExercise', 'editExercises']);

		if (option === 'editExercises') {
			const exercises = await conversation.external(async () => getAllUserExercises(user_id));
			conversation.log(exercises);
			if (!exercises) {
				throw new Error('Failed to get the Exercise Data');
			}

			const exerciseToEdit = await getExercise(ctx, conversation, exercises, chat_id, message_id);

			await ctx.api.editMessageText(
				chat_id,
				message_id,
				`<b>EDIT ${exerciseToEdit.toUpperCase()}</b>\n\nWhat would you like to do with it?`,
				{
					parse_mode: 'HTML',
					reply_markup: new InlineKeyboard().text('Delete').text('Edit'),
				});
		}

		if (option === 'addNewExercise') {
			await ctx.api.editMessageText(
				chat_id,
				message_id,
				'<b>ADD NEW EXERCISE</b>\n\nType in the name:',
				{
					parse_mode: 'HTML',
				});

			const name = await conversation.form.text();

			const message = await ctx.reply(
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

			await ctx.api.editMessageText(
				chat_id,
				message.message_id,
				`<b>ADD ${name.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`,
				{
					parse_mode: 'HTML',
					reply_markup: new InlineKeyboard().text('Legs').row().text('Chest').row().text('Back'),
				},
			);

			const {callbackQuery: {data: category}} = await conversation.waitForCallbackQuery(['Chest', 'Legs', 'Back']);

			const createdExercise = await conversation.external(async () => createUserExercise(user_id, name, category, is_compound));
			// CreateExercise(name, category, is_compound)

			if (!createdExercise) {
				throw new Error('Failed to create exercise');
			}

			await ctx.api.editMessageText(
				chat_id,
				message.message_id,
				`You've added <b>${name.toUpperCase()}</b> to your exercise list!`,
				{
					parse_mode: 'HTML',
				},
			);
		}
	} catch (e) {
		console.log(e);
	}
}

composer
	.use(createConversation(handleEditExercises));

composer.command('edit_exercises', async ctx => {
	await ctx.conversation.enter('handleEditExercises');
});

export default composer;
