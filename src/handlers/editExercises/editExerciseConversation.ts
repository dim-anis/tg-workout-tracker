import {type MyConversation, type MyContext} from '../../types/bot';
import {getYesNoOptions} from '../../config/keyboards';
import {InlineKeyboard} from 'grammy';
import {updateUserExercise} from '../../models/user';
import waitForTextAndRemove from '../../handlers/helpers/waitForTextAndRemove';

const muscleGroups = ['Legs', 'Chest', 'Back', 'Biceps', 'Triceps'];

export default async function editExerciseConversation(conversation: MyConversation, ctx: MyContext) {
	const currName = ctx.session.state.data;
	await ctx.editMessageText(`<b>EDIT NAME\n\n${currName.toUpperCase()} => ...</b>\n\nType in the new name:`, {
		parse_mode: 'HTML',
		reply_markup: undefined,
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

	const muscleGroupsKbd = new InlineKeyboard();
	muscleGroups.forEach(group => muscleGroupsKbd.text(group).row());

	await ctx.editMessageText(
		`<b>ADD ${name.toUpperCase()}</b>\n\nWhat muscle group is it primarily targeting?`,
		{
			parse_mode: 'HTML',
			reply_markup: muscleGroupsKbd,
		},
	);

	const {callbackQuery: {data: category}} = await conversation.waitForCallbackQuery(muscleGroups);

	const createdExercise = await conversation.external(async () => updateUserExercise(
		ctx.dbchat.user_id,
		currName,
		{name, category, is_compound},
	));

	if (!createdExercise) {
		throw new Error('Failed to update exercise');
	}

	await ctx.editMessageText(
		`👌 <b>${name.toUpperCase()}</b> updated!`,
		{
			parse_mode: 'HTML',
		},
	);
}
