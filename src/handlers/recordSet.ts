/* eslint-disable no-await-in-loop */
import {Composer} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getRpeOptions, getMenuFromStringArray, backButton, getYesNoOptions} from '../config/keyboards';
import {createOrUpdateUserWorkout} from '../models/user';
import {userHasExercises} from '../middleware/userHasExercises';
import {promptUserForRPE, promptUserForRepetitions, promptUserForWeight, promptUserForYesNo} from './helpers/promptUser';
import { successMessages } from './helpers/successMessages';

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
			const {lastMessageId} = conversation.session.state;
			const isDeload = await isDeloadWorkout(ctx, conversation);
			const chosenExercise = await chooseExercise(ctx, conversation, chat_id, categories, exercisesByCategory);
			const setData = await getSetData(ctx, conversation, chosenExercise, chat_id);
			const updatedWorkout = await conversation.external(async () => createOrUpdateUserWorkout(user_id, setData, isDeload));

			const successOptions = {reply_markup: await getYesNoOptions('recordSet'), parse_mode: 'HTML'};
			const recordOneMoreSet = await promptUserForYesNo(ctx, conversation, chat_id, lastMessageId, successMessages.onRecordSetSuccess, successOptions);

			recordMoreSets = (recordOneMoreSet === 'yes');

			await ctx.api.deleteMessage(chat_id, lastMessageId);
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
	const {lastMessageId} = conversation.session.state;
	await ctx.api.editMessageText(
		chat_id,
		lastMessageId,
		'<b>Record exercise</b>\n\n<i>Choose a category:</i>',
		{
			reply_markup: await getMenuFromStringArray([...categories]),
			parse_mode: 'HTML',
		},
	);

	const {callbackQuery: {data: category}} = await conversation.waitForCallbackQuery([...categories]);

	await ctx.api.editMessageText(
		chat_id,
		lastMessageId,
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
	const {lastMessageId} = conversation.session.state;

	const weightTextOptions = {parse_mode: 'HTML'};
	const weightText = `<b>${exercise.toUpperCase()}</b>\n\nType in the weight:`;
	const weight = await promptUserForWeight(ctx, conversation, chat_id, lastMessageId, weightText, weightTextOptions);

	const repetitionsTextOptions = {parse_mode: 'HTML'};
	const repetitionsText = `<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs</i>\n\nType in the repetitions:`;
	const repetitions = await promptUserForRepetitions(ctx, conversation, chat_id, lastMessageId, repetitionsText, repetitionsTextOptions);

	const rpeTextOptions = {parse_mode: 'HTML', reply_markup: await getRpeOptions('recordSet')};
	const rpeText = `<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs x ${repetitions}</i>\n\nChoose the RPE:`;
	const rpe = await promptUserForRPE(ctx, conversation, chat_id, lastMessageId, rpeText, rpeTextOptions);

	return {exercise, weight, repetitions, rpe};
}

export async function isDeloadWorkout(ctx: MyContext, conversation: MyConversation) {
	const {message_id} = await ctx.reply('Is it a <b>deload workout</b>?', {
		parse_mode: 'HTML',
		reply_markup: await getYesNoOptions('recordSet'),
	});

	conversation.session.state.lastMessageId = message_id;

	const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(['recordSet:yes', 'recordSet:no']);
	return data.split(':')[1] === 'yes' ? true : false;
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
