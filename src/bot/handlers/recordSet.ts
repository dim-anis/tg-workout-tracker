/* eslint-disable no-await-in-loop */

import {Composer} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from 'bot/types/bot';
import type {ExerciseType} from '../../models/exercise';
import {getMainMenu, getRpeOptions, getMenuFromStringArray} from '../config/keyboards';
import {upsertSet} from '../api/workouts';
import {getAllExercises} from '../api/exercises';

const composer = new Composer<MyContext>();

const filterByCategory = (array: ExerciseType[], category: string) => array.filter(item => item.category === category);

async function getCategory(ctx: MyContext, conversation: MyConversation, categories: string[]) {
	await ctx.editMessageText('Choose a category:', {reply_markup: await getMenuFromStringArray(categories)});

	const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(categories);
	return data;
}

async function getExercise(ctx: MyContext, conversation: MyConversation, exercises: ExerciseType[]) {
	const categories = [...new Set(exercises.map(exercise => exercise.category))];
	let canContinue = false;
	let chosenExercise = '';

	do {
		const category = await getCategory(ctx, conversation, categories);
		const exercisesByCategory = filterByCategory(exercises, category).map(exercise => exercise.name);

		await ctx.editMessageText(
			`<b>${category.toUpperCase()}</b>\n\nChoose an exercise:`,
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

async function getSetData(ctx: MyContext, conversation: MyConversation, exercise: string) {
	await ctx.editMessageText(
		`<b>${exercise?.toUpperCase()}</b>\n\nType in the weight:`,
		{parse_mode: 'HTML'},
	);
	const weight: number = await conversation.form.number(async ctx => ctx.reply('❌ <b>Must be a number!</b>\n\nTry again:', {parse_mode: 'HTML'}));

	await ctx.reply(
		`<b>${exercise?.toUpperCase()}</b>\n\n<i>${weight}kgs</i>\n\nType in the repetitions:`,
		{parse_mode: 'HTML'},
	);
	const repetitions: number = await conversation.form.int(async ctx => ctx.reply('❌ <b>Must be a number!</b>\n\nTry again:', {parse_mode: 'HTML'}));

	await ctx.reply(
		`<b>${exercise?.toUpperCase()}</b>\n\n<i>${weight}kgs x ${repetitions}</i>\n\nChoose the RPE:`,
		{parse_mode: 'HTML', reply_markup: await getRpeOptions()},
	);
	const {callbackQuery: {data: rpe}} = await conversation.waitForCallbackQuery(/[+-]?(\d*\.\d+|\d+\.\d*|\d+)/gm);

	return {exercise, weight, repetitions, rpe};
}

const handleRecordSet = async (conversation: MyConversation, ctx: MyContext) => {
	try {
		const response = await conversation.external(async () => getAllExercises());
		if (!response.data) {
			throw new Error('Failed to get the Exercise Data');
		}

		const allExercises = response.data;
		const chosenExercise = await getExercise(ctx, conversation, allExercises);
		const setData = await getSetData(ctx, conversation, chosenExercise);

		const payload = {
			user_id: ctx.dbchat.user_id,
			sets: [setData],
		};
		const r = await conversation.external(async () => upsertSet(JSON.stringify(payload)));

		if (!r.data) {
			throw new Error('POST request failed!');
		}

		await ctx.reply('✅ Success!');
		await ctx.reply('Choose an option:', {reply_markup: await getMainMenu()});
		return;
	} catch (err: unknown) {
		console.log(err);
	}
};

composer
	.use(createConversation(handleRecordSet));

composer.callbackQuery('/record_set', async ctx => {
	await ctx.conversation.enter('handleRecordSet');
});

export default composer;
