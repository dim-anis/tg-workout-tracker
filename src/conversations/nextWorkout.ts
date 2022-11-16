import axios from 'axios';
import {generateMenu, getDurationInMin} from '../utils/utils';
import {
	type Conversation,
} from '@grammyjs/conversations';
import type {MyContext} from '../bot.js';
import {Api, InlineKeyboard} from 'grammy';
import type {WorkoutType} from '../models/workouts';

import {rpeOptions, repOptions, weightOptions} from '../config/keyboards';
import type {GetWorkoutsResponse, UpdateWorkoutResponse} from '../config/api';

type MyConversation = Conversation<MyContext>;

const recordSet = async (conversation: MyConversation, ctx: MyContext, selectedExercise: string, predictedWeight: number, predictedReps: number, hitAllReps: boolean) => {
	const {chat: {id: chatId}, message_id: messageId} = await ctx.reply(
		`<b>${selectedExercise}</b>\n\nPlease enter the weight\n\nLast working weight: <b>${predictedWeight}kg</b>\n\n${hitAllReps ? '🟢 Ready to increase the weight' : '🔴 Didn\'t hit all reps last time'}`,
		{reply_markup: weightOptions, parse_mode: 'HTML'},
	);
	const {callbackQuery: {data, id: idWeightCb}} = await conversation.waitFor('callback_query:data');
	await ctx.api.answerCallbackQuery(idWeightCb);

	let weightIncrement = data;
	let canContinue = false;
	let iteration = 0;
	let allSets = [];

	do {
		let newWeight;
		let newReps;

		if (iteration > 0) {
			await ctx.api.editMessageText(chatId, messageId, `<b>${selectedExercise} ${'•'.repeat(allSets?.length)}</b>\n\nPlease enter the weight\n\nLast working weight: <b>${predictedWeight}kg</b>\n\n${hitAllReps ? '🟢 Ready to increase the weight' : '🔴 Didn\'t hit all reps last time'}`, {reply_markup: weightOptions, parse_mode: 'HTML'});
			const {callbackQuery: {data, id: idWeightCb}} = await conversation.waitFor('callback_query:data');
			weightIncrement = data;
			await ctx.api.answerCallbackQuery(idWeightCb);
		}

		if (weightIncrement === 'customWeightValue') {
			await ctx.api.editMessageText(chatId, messageId, 'Please enter your desired weight:');
			const weight = await getValidNumber(conversation, ctx, 1000, '❌ There was an error: make sure it\' a single number above 0');
			newWeight = weight;
		} else {
			newWeight = predictedWeight + Number(weightIncrement);
		}

		await ctx.api.editMessageText(chatId, messageId, `<b>${selectedExercise} ${'•'.repeat(allSets?.length)}</b>\n\nPlease enter the repetitions\n\nExpected number of repetitions: <b>${predictedReps}</b>\n\n${hitAllReps ? '🟢 Hit all reps last time' : '🔴 Didn\'t hit all reps last time'}`, {reply_markup: repOptions, parse_mode: 'HTML'});
		const {callbackQuery: {data: repIncrement, id: idRepCb}} = await conversation.waitFor('callback_query:data');
		await ctx.api.answerCallbackQuery(idRepCb);

		if (repIncrement === 'customRepValue') {
			await ctx.api.editMessageText(chatId, messageId, 'Please enter your desired repetitions:');
			const reps = await getValidNumber(conversation, ctx, 100, '❌ There was an error: make sure it\' a single number above 0');
			newReps = reps;
		} else {
			newReps = predictedReps + Number(repIncrement);
		}

		await ctx.api.editMessageText(chatId, messageId, `<b>${selectedExercise} ${'•'.repeat(allSets?.length)}</b>\n\nPlease enter the RPE\n\nHow hard was this set?`, {reply_markup: rpeOptions, parse_mode: 'HTML'});
		const {callbackQuery: {data: rpeData, id: idRpeCb}} = await conversation.waitFor('callback_query:data');
		await ctx.api.answerCallbackQuery(idRpeCb);

		const newRpe = Number(rpeData);

		// Record the set here
		const set = {
			user: 'Dmitry Anisov',
			sets: [{exercise: selectedExercise, weight: newWeight, repetitions: newReps, rpe: newRpe}],
		};
		const payload = JSON.stringify(set);
		const options = {
			headers: {
				'Content-Type': 'application/json',
			},
		};
		const {data: updatedWorkout} = await conversation.external(async () => axios.put<UpdateWorkoutResponse>('http://localhost:5000/workouts', payload, options).then(response => response.data));
		allSets = updatedWorkout.sets.filter(set => set.exercise === selectedExercise);

		const replyOptions = new InlineKeyboard();
		replyOptions.text('Finish', 'yes');
		replyOptions.text('One more set?', 'continue');

		await ctx.api.editMessageText(chatId, messageId, `<b>${selectedExercise} ${'•'.repeat(allSets?.length)}</b>\n\n${newWeight} kgs x ${newReps} @ ${newRpe}RPE\n\n🟢 Set was successfully recorded`, {reply_markup: replyOptions, parse_mode: 'HTML'});
		const {callbackQuery: {data: endExercise, id: endExCb}} = await conversation.waitFor('callback_query:data');
		await ctx.api.answerCallbackQuery(endExCb);

		iteration++;

		if (endExercise === 'yes') {
			canContinue = true;
			await ctx.api.deleteMessage(chatId, messageId);
			return updatedWorkout;
		}
	} while (!canContinue);
};

const getValidNumber = async (conversation: MyConversation, ctx: MyContext, maxValue: number, errorMessage: string) => {
	const isNum = (value: number) => typeof value === 'number' && !Number.isNaN(value);

	let isInputValid = false;
	let iteration = 0;
	let validWeight;

	do {
		if (iteration > 0) {
			await ctx.reply(errorMessage);
		}

		const {message: {text: weightInput}} = await conversation.waitFor('message');
		const weight = Number(weightInput);
		isInputValid = isNum(weight) && weight > 0 && weight < maxValue;

		validWeight = weight;

		iteration++;
	} while (!isInputValid);

	return validWeight;
};

const averageRpe = (array: WorkoutType['sets']) => array.reduce((total, set) => total + set.rpe, 0) / array.length;

const handleNextWorkout = async (conversation: MyConversation, ctx: MyContext) => {
	const splitLength = 4;
	const mesocycleLength = 16;
	try {
		const {data: workouts} = await conversation.external(async () => axios.get<GetWorkoutsResponse>('http://localhost:5000/workouts').then(response => response.data));
		if (workouts.length < splitLength) {
			const options = new InlineKeyboard();
			options.text('Record a set?', '/record_set');
			await ctx.reply(
				'Not enough data for projection. Try again in a few workouts.\n\nMeanwhile, you can record your workouts via /record_set command.', {reply_markup: options},
			);
			return;
		}

		// Finds the last workout with an average RPE of < 6. This is the last deload workout. Next workout after that one is the start of the new Mesocycle.
		const currentMesoStartIndex = workouts.findIndex(workout => averageRpe(workout.sets) < 6) - 1;
		const currentMesoWorkouts = workouts.slice(0, currentMesoStartIndex + 1);

		const deloadEndIndex = currentMesoStartIndex + 1;
		const deloadStartIndex = currentMesoStartIndex + 4;
		const lastMesoDeloadWorkouts = workouts.slice(deloadEndIndex, deloadStartIndex + 1);

		const workoutsBeforeCurrentMeso = workouts.slice(currentMesoStartIndex + lastMesoDeloadWorkouts.length);
		const lastMesoStartIndex = workoutsBeforeCurrentMeso.findIndex(workout => averageRpe(workout.sets) < 6) - 1;
		const lastMesoWorkouts = workoutsBeforeCurrentMeso.slice(0, lastMesoStartIndex + 1);

		const hasOneMicro = currentMesoWorkouts.length >= splitLength;
		const workoutNumber = currentMesoWorkouts.length + 1;

		let nextWorkout: WorkoutType;

		if (hasOneMicro) {
			nextWorkout = currentMesoWorkouts[splitLength - 1];
		} else if (lastMesoWorkouts.length < splitLength) {
			const options = new InlineKeyboard();
			options.text('Record a set?', '/record_set');
			await ctx.reply(
				'Not enough data for projection. Try again in a few workouts.\n\nMeanwhile, you can record your workouts via /record_set command.', {reply_markup: options},
			);
			return;
		} else {
			const lastMesoPlusDeload = [...lastMesoDeloadWorkouts, ...lastMesoWorkouts];
			const workoutIndex = splitLength - currentMesoWorkouts.length;
			nextWorkout = lastMesoPlusDeload[workoutIndex - 1];
		}

		const nextWorkoutExercises = [...new Set(nextWorkout.sets.map(set => set.exercise))];

		// Start of the WORKOUT block
		const kbdOptions = generateMenu(nextWorkoutExercises);

		const {chat: {id: chatId}, message_id: messageId} = await ctx.reply(
			`<b>Workout #${currentMesoWorkouts.length + 1}</b> of current mesocycle:`,
			{reply_markup: kbdOptions, parse_mode: 'HTML'},
		);

		const {callbackQuery: {data, id}} = await conversation.waitFor('callback_query:data');
		await ctx.api.answerCallbackQuery(id);

		let currentWorkout!: WorkoutType;
		let selectedExercise = data;
		let workoutFinished = false;
		let iteration = 0;

		do {
			if (iteration > 0) {
				const setCount = currentWorkout.sets.reduce<Record<string, number>>((result, curr) => {
					if (curr.exercise in result) {
						result[curr.exercise]++;
					} else {
						result[curr.exercise] = 1;
					}

					return result;
				}, {});

				const kbdOptions = new InlineKeyboard();
				for (const option of nextWorkoutExercises) {
					kbdOptions.text(`${option} ${'•'.repeat(setCount[option])}`, option).row();
				}

				await ctx.api.editMessageText(chatId, messageId, `<b>Workout #${workoutNumber}</b> of current mesocycle:`, {reply_markup: kbdOptions, parse_mode: 'HTML'});

				const {callbackQuery: {data, id}} = await conversation.waitFor('callback_query:data');
				await ctx.api.answerCallbackQuery(id);

				selectedExercise = data;
			}

			const predictedReps = nextWorkout.sets.find(set => set.exercise === selectedExercise)!.repetitions;
			const hitAllReps = nextWorkout.sets.filter(set => set.exercise === selectedExercise).every(set => set.repetitions >= predictedReps);
			const allSets = nextWorkout.sets.filter(set => set.exercise === selectedExercise);
			const numOfSets = allSets.length;
			const allSetsAvgRpe = allSets.reduce((total, set) => total + set.rpe, 0) / numOfSets;

			let predictedWeight;

			if (hasOneMicro) {
				predictedWeight = nextWorkout.sets.find(set => set.exercise === selectedExercise)?.weight;
			} else {
				const workoutsFiltered
				= lastMesoWorkouts
					.filter(workout =>
						workout.sets
							.some(set => set.exercise === selectedExercise && set.repetitions === predictedReps));
				const weights
				= workoutsFiltered
					.map(workout =>
						workout.sets
							.filter(set => set.exercise === selectedExercise && set.repetitions === predictedReps)
							.map(set => set.weight));

				predictedWeight = Math.min(...weights.flat(1));
			}

			if (typeof predictedWeight === 'undefined') {
				const options = new InlineKeyboard();
				options.text('Record a set?', '/record_set');
				await ctx.reply(
					'Couldn\'t find all of the required data. Did you change your routine recently?\n\nTry recording your sets with /record_set and come back to /next_workout later.',
					{reply_markup: options},
				);
			} else {
			/// Start recording SETS of the chosen exercise
				const data = await recordSet(conversation, ctx, selectedExercise, predictedWeight, predictedReps, hitAllReps);
				currentWorkout = data!;

				const replyOptions = new InlineKeyboard();
				replyOptions.text('No', 'continueWorkout');
				replyOptions.text('Yes', 'finishWorkout');

				await ctx.api.editMessageText(chatId, messageId, 'Would you like to finish this workout?', {reply_markup: replyOptions});
				const {callbackQuery: {data: option, id: finishId}} = await conversation.waitFor('callback_query:data');
				await ctx.api.answerCallbackQuery(finishId);

				if (option === 'finishWorkout') {
					workoutFinished = true;
				}
			}

			iteration++;
		} while (!workoutFinished);

		// Calculate the stats here and send in a message
		const durationInMin = getDurationInMin(new Date(currentWorkout.createdAt), new Date(currentWorkout.updatedAt));
		const hours = Math.floor(durationInMin / 60);
		const minutes = Math.floor(durationInMin % 60);

		const avgRpe = averageRpe(currentWorkout.sets);
		await ctx.api.editMessageText(chatId, messageId, `<b>Workouts Statistics</b>\n\nWorkout ${workoutNumber}/<b>${mesocycleLength}</b>\n\nTotal duration: <b>${hours}h ${minutes}min</b>\nAverage RPE: <b>${avgRpe}</b>`, {parse_mode: 'HTML'});
	} catch (err: unknown) {
		console.log(err);
	}
};

export default handleNextWorkout;
