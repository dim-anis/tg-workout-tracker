/* eslint-disable no-await-in-loop */

import {type MyContext, type MyConversation} from '../../types/bot';
import {type ExerciseType} from 'models/exercise';
import {backButton, getMenuFromStringArray} from '../../config/keyboards';

export async function getCategory(ctx: MyContext, conversation: MyConversation, categories: string[], chat_id: number, message_id: number) {
	await ctx.api.editMessageText(
		chat_id,
		message_id,
		'Choose a category:',
		{reply_markup: await getMenuFromStringArray(categories)},
	);

	const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(categories);
	return data;
}

const filterByCategory = (array: ExerciseType[], category: string) => array.filter(item => item.category === category);

export async function getExercise(ctx: MyContext, conversation: MyConversation, exercises: ExerciseType[], chat_id: number, message_id: number) {
	const categories = [...new Set(exercises.map(exercise => exercise.category))];
	let canContinue = false;
	let chosenExercise = '';

	do {
		const category = await getCategory(ctx, conversation, categories, chat_id, message_id);
		const exercisesByCategory = filterByCategory(exercises, category).map(exercise => exercise.name);

		await ctx.api.editMessageText(
			chat_id,
			message_id,
			`<b>${category.toUpperCase()}</b>\n\nChoose an exercise:`,
			{
				reply_markup: await getMenuFromStringArray(exercisesByCategory, {addBackButton: true}),
				parse_mode: 'HTML',
			},
		);

		const {callbackQuery: {data: exercise}} = await conversation.waitForCallbackQuery([backButton, ...exercisesByCategory]);

		if (exercise !== backButton) {
			canContinue = true;
			chosenExercise = exercise;
		}
	} while (!canContinue);

	return chosenExercise;
}
