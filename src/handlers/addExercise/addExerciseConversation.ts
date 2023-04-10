import {InlineKeyboard} from 'grammy';
import type {MyConversation, MyContext} from '../../types/bot';
import {getYesNoOptions} from '../../config/keyboards';
import {exerciseCategories} from '../../config/exercises';
import {createUserExercise} from '../../models/user';
import {promptUserForExerciseName, promptUserForYesNo} from '../helpers/promptUser';

function getExerciseCategoriesMenu(categories: string[]) {
	const categoryOptionsKbd = new InlineKeyboard();
	for (const [index, cat] of exerciseCategories.entries()) {
		if (index % 3 === 0) {
			categoryOptionsKbd.row();
		}

		categoryOptionsKbd
			.text(cat);
	}

	return categoryOptionsKbd;
}

export default async function handleAddExercise(conversation: MyConversation, ctx: MyContext) {
	if (!ctx.chat) {
		return;
	}

	const {user_id} = ctx.dbchat;
	const {lastMessageId} = ctx.session.state;
	const {id: chat_id} = ctx.chat;

	try {
		const nameText = '📋 <b>Add new exercise</b>\n\nType in the name:';
		const nameOptions = {parse_mode: 'HTML', reply_markup: undefined};
		const name = await promptUserForExerciseName(ctx, conversation, chat_id, lastMessageId, nameText, nameOptions);

		const isCompoundText = `📋 <b>Add ${name.toUpperCase()}</b>\n\n`
		+ 'Is it a compound exercise?\n\n'
		+ '<i>*Involving two or more joints at once, think heavy exercises like squats, bench press etc.</i>';
		const isCompoundTextOptions = {parse_mode: 'HTML', reply_markup: await getYesNoOptions()};
		const isCompound = await promptUserForYesNo(ctx, conversation, chat_id, lastMessageId, isCompoundText, isCompoundTextOptions);

		const is_compound = isCompound.toLowerCase().trim() === 'yes' || isCompound.toLowerCase().trim() === 'yesoption';

		const categoryText = `📋 <b>Add ${name.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`;
		const categoryOptions = {parse_mode: 'HTML', reply_markup: getExerciseCategoriesMenu(exerciseCategories)};
		const category = await promptUserForExerciseName(ctx, conversation, chat_id, lastMessageId, categoryText, categoryOptions); // <- same logic as in promptUserForExerciseName

		const updatedUser = await conversation.external(async () => createUserExercise(
			user_id,
			{name, category, is_compound},
		));

		if (!updatedUser) {
			throw new Error('Failed to create exercise');
		}

		const newExericse = updatedUser.exercises[updatedUser.exercises.length - 1];
		ctx.dbchat.exercises.push(newExericse);

		await ctx.api.editMessageText(
			chat_id,
			lastMessageId,
			`📋 <b>Add new exercise</b>\n\nYou've added <b>${name.toUpperCase()}</b> to your exercise list!`,
			{
				parse_mode: 'HTML',
			},
		);
	} catch (e) {
		console.log(e);
	}
}
