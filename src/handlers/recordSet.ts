/* eslint-disable no-await-in-loop */

import {Composer} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import type {ExerciseType} from '../models/exercise';
import {getMainMenu, getRpeOptions, getMenuFromStringArray, rpeValues} from '../config/keyboards';
import {createOrUpdateUserWorkout} from '../models/user';

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
	const {callbackQuery: {data: rpeString}} = await conversation.waitForCallbackQuery(rpeValues.map(val => val.toString()));
	const rpe = Number(rpeString);

	return {exercise, weight, repetitions, rpe};
}

const handleRecordSet = async (conversation: MyConversation, ctx: MyContext) => {
	const {user_id} = ctx.dbchat;

	try {
		const {exercises} = ctx.dbchat;
		if (!exercises) {
			throw new Error('No exercises found!');
		}

		const chosenExercise = await getExercise(ctx, conversation, exercises);
		const setData = await getSetData(ctx, conversation, chosenExercise);
		const updatedWorkout = await conversation.external(async () => createOrUpdateUserWorkout(ctx.dbchat.user_id, setData));

		if (!updatedWorkout) {
			throw new Error('Failed to record a set!');
		}

		await ctx.reply('<b>✅ Success!\n\nChoose an option:</b>', {reply_markup: await getMainMenu(), parse_mode: 'HTML'});
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
