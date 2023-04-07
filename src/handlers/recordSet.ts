/* eslint-disable no-await-in-loop */

import {Composer, InlineKeyboard} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import type {ExerciseType} from '../models/exercise';
import {getRpeOptions, getMenuFromStringArray, rpeValues} from '../config/keyboards';
import {createOrUpdateUserWorkout} from '../models/user';
import {userHasExercises} from '../middleware/userHasExercises';

const composer = new Composer<MyContext>();

const handleRecordSet = async (conversation: MyConversation, ctx: MyContext) => {
	if (!ctx.chat) {
		return;
	}

	const {user_id, exercises} = ctx.dbchat;
	const {id: chat_id} = ctx.chat;

	try {
		const typeOfWorkout = await getTypeOfWorkout(ctx, conversation);
		const chosenExercise = await getExercise(ctx, conversation, exercises, chat_id);
		const setData = await getSetData(ctx, conversation, chosenExercise, chat_id);
		const updatedWorkout = await conversation.external(async () => createOrUpdateUserWorkout(user_id, setData));

		if (!updatedWorkout) {
			throw new Error('Failed to record a set!');
		}

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

		if (option === 'yes') {
			console.log('she said yes');
		}
	} catch (err: unknown) {
		console.log(err);
	}
};

async function getCategory(ctx: MyContext, conversation: MyConversation, categories: string[], chat_id: number) {
	await ctx.api.editMessageText(
		chat_id,
		ctx.session.state.lastMessageId,
		'<b>Record exercise</b>\n\n<i>Choose a category:</i>',
		{
			reply_markup: await getMenuFromStringArray(categories),
			parse_mode: 'HTML',
		},
	);

	const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(categories);
	return data;
}

async function getExercise(ctx: MyContext, conversation: MyConversation, exercises: ExerciseType[], chat_id: number) {
	const categories = [...new Set(exercises.map(exercise => exercise.category))];
	let canContinue = false;
	let chosenExercise = '';

	do {
		const category = await getCategory(ctx, conversation, categories, chat_id);
		const exercisesByCategory = exercises.filter(ex => ex.category === category).map(ex => ex.name);

		await ctx.api.editMessageText(
			chat_id,
			ctx.session.state.lastMessageId,
			`<b>Record exercise</b>\n\n<b>${category}</b>\n\n<i>Choose an exercise:</i>`,
			{
				reply_markup: await getMenuFromStringArray(exercisesByCategory, {addBackButton: true}),
				parse_mode: 'HTML',
			},
		);

		const {callbackQuery: {data: exercise}} = await conversation.waitForCallbackQuery(['≪ Back', ...exercisesByCategory]);

		if (exercise !== '≪ Back') {
			canContinue = true;
			chosenExercise = exercise;
		}
	} while (!canContinue);

	return chosenExercise;
}

async function getSetData(ctx: MyContext, conversation: MyConversation, exercise: string, chat_id: number) {
	await ctx.editMessageText(
		`<b>${exercise.toUpperCase()}</b>\n\nType in the weight:`,
		{parse_mode: 'HTML'},
	);
	const weight: number = await conversation.form.number(async ctx => ctx.reply('❌ <b>Must be a number!</b>\n\nTry again:', {parse_mode: 'HTML'}));

	await ctx.reply(
		`<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs</i>\n\nType in the repetitions:`,
		{parse_mode: 'HTML'},
	);
	const repetitions: number = await conversation.form.int(async ctx => ctx.reply('❌ <b>Must be a number!</b>\n\nTry again:', {parse_mode: 'HTML'}));

	await ctx.reply(
		`<b>${exercise.toUpperCase()}</b>\n\n<i>${weight}kgs x ${repetitions}</i>\n\nChoose the RPE:`,
		{parse_mode: 'HTML', reply_markup: await getRpeOptions()},
	);
	const {callbackQuery: {data: rpeString}} = await conversation.waitForCallbackQuery(rpeValues.map(val => val.toString()));
	const rpe = Number(rpeString);

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
