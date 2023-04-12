/* eslint-disable no-await-in-loop */
import {Composer, InlineKeyboard} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getRpeOptions, getMenuFromStringArray, backButton} from '../config/keyboards';
import {createOrUpdateUserWorkout} from '../models/user';
import {userHasExercises} from '../middleware/userHasExercises';
import {promptUserForRPE, promptUserForRepetitions, promptUserForWeight} from './helpers/promptUser';

const composer = new Composer<MyContext>();

const handleRecordSet = async (conversation: MyConversation, ctx: MyContext) => {
	if (!ctx.chat) {
		return;
	}

	const {user_id, exercises} = ctx.dbchat;
	const {id: chat_id} = ctx.chat;
	const categories = new Set(exercises.map(exercise => exercise.category));

	const exercisesByCategory = new Map<string, string[]>();

	for (const category of categories) {
		exercisesByCategory.set(category, []);
	}

	for (const exercise of exercises) {
		exercisesByCategory.get(exercise.category)!.push(exercise.name);
	}

	let recordMoreSets = true;

	while (recordMoreSets) {
		try {
			const typeOfWorkout = await getTypeOfWorkout(ctx, conversation);
			const chosenExercise = await chooseExercise(ctx, conversation, chat_id, categories, exercisesByCategory);
			const setData = await getSetData(ctx, conversation, chosenExercise, chat_id);
			const updatedWorkout = await conversation.external(async () => createOrUpdateUserWorkout(user_id, setData));

			await ctx.api.editMessageText(
				chat_id,
				ctx.session.state.lastMessageId,
				'<b>✅ Success!\n\nRecord one more set?</b>',
				{
					reply_markup: new InlineKeyboard().text('No', 'recordSet:no').text('Yes', 'recordSet:yes'),
					parse_mode: 'HTML',
				},
			);
			const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(/recordSet:(no|yes)/);
			const option = data.split(':')[1];

			recordMoreSets = option === 'yes';

			await ctx.api.editMessageText(chat_id, ctx.session.state.lastMessageId, '<b>✅ Success!</b>', {
				reply_markup: undefined,
				parse_mode: 'HTML',
			});
		} catch (err: unknown) {
			console.log(err);
		}
	}
};

async function chooseExercise(
	ctx: MyContext,
	conversation: MyConversation,
	chat_id: number,
	categories: Set<string>,
	exercisesByCategory: Map<string, string[]>,
): Promise<string> {
	await ctx.api.editMessageText(
		chat_id,
		ctx.session.state.lastMessageId,
		'<b>Record exercise</b>\n\n<i>Choose a category:</i>',
		{
			reply_markup: await getMenuFromStringArray([...categories]),
			parse_mode: 'HTML',
		},
	);

	const {callbackQuery: {data: category}} = await conversation.waitForCallbackQuery([...categories]);

	await ctx.api.editMessageText(
		chat_id,
		ctx.session.state.lastMessageId,
		`<b>Record exercise</b>\n\n<b>${category}</b>\n\n<i>Choose an exercise:</i>`,
		{
			reply_markup: await getMenuFromStringArray(exercisesByCategory.get(category)!, {addBackButton: true}),
			parse_mode: 'HTML',
		},
	);

	const {callbackQuery: {data: exercise}} = await conversation.waitForCallbackQuery([backButton, ...exercisesByCategory.get(category)!]);

	if (exercise === backButton) {
		return chooseExercise(ctx, conversation, chat_id, categories, exercisesByCategory);
	}

	return exercise;
}

async function getSetData(ctx: MyContext, conversation: MyConversation, exercise: string, chat_id: number) {
	const {lastMessageId} = ctx.session.state;

	const weightTextOptions = {parse_mode: 'HTML'};
	const weightText = `<b>${exercise.toUpperCase()}</b>\n\nType in the weight:`;
	const weight = await promptUserForWeight(ctx, conversation, chat_id, ctx.session.state.lastMessageId, weightText, weightTextOptions);

	const repetitionsTextOptions = {parse_mode: 'HTML'};
	const repetitionsText = `<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs</i>\n\nType in the repetitions:`;
	const repetitions = await promptUserForRepetitions(ctx, conversation, chat_id, lastMessageId, repetitionsText, repetitionsTextOptions);

	const rpeTextOptions = {parse_mode: 'HTML', reply_markup: await getRpeOptions('recordSet')};
	const rpeText = `<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs x ${repetitions}</i>\n\nChoose the RPE:`;
	const rpe = await promptUserForRPE(ctx, conversation, chat_id, lastMessageId, rpeText, rpeTextOptions);

	return {exercise, weight, repetitions, rpe};
}

async function getTypeOfWorkout(ctx: MyContext, conversation: MyConversation) {
	const {message_id} = await ctx.reply('<b>Type of workout</b>\n\nIs it a deload or a regular workout?', {
		parse_mode: 'HTML',
		reply_markup: new InlineKeyboard().text('Deload', 'recordSet:deload').text('Regular', 'recordSet:regular'),
	});

	ctx.session.state.lastMessageId = message_id;

	const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(['recordSet:deload', 'recordSet:regular']);
	return data.split(':')[1];
}

composer
	.use(createConversation(handleRecordSet));

composer
	.command(
		'record_set',
		userHasExercises,
		async ctx => ctx.conversation.enter('handleRecordSet'));
composer
	.callbackQuery(
		'/record_set',
		userHasExercises,
		async ctx => ctx.conversation.enter('handleRecordSet'));

export default composer;
