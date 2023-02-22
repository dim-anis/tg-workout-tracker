/* eslint-disable no-await-in-loop */

import {Composer, InlineKeyboard} from 'grammy';
import {toHoursAndMins} from '../utils';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from 'bot/types/bot';
import type {WorkoutType} from '../../models/workout';
import {getRpeOptions, getRepOptions, getWeightOptions, getYesNoOptions} from '../config/keyboards';
import {updateWorkout, getWorkouts} from '../api/workouts';

const composer = new Composer<MyContext>();

async function getWeight(ctx: MyContext, conversation: MyConversation, selectedExercise: string, predictedWeight: number, hitAllReps: boolean, setsCompletedIndicator: string) {
	await ctx.editMessageText(
		`<b>${selectedExercise} ${setsCompletedIndicator}</b>\n\nPlease enter the weight\n\nLast working weight: <b>${predictedWeight}kg</b>\n\n${hitAllReps ? '🟢 Hit all reps last time' : '🔴 Didn\'t hit all reps last time'}`,
		{reply_markup: await getWeightOptions(), parse_mode: 'HTML'},
	);

	let weight;

	const context = await conversation.waitFor(['callback_query:data', 'message:text']);
	if (context.callbackQuery?.data) {
		weight = predictedWeight + Number(context.callbackQuery?.data);
	} else {
		weight = Number(context.message?.text);
	}

	return weight;
}

async function getRepetitions(ctx: MyContext, conversation: MyConversation, selectedExercise: string, predictedReps: number, hitAllReps: boolean, setsCompletedIndicator: string) {
	await ctx.editMessageText(
		`<b>${selectedExercise} ${setsCompletedIndicator}</b>\n\nPlease enter the repetitions\n\nExpected number of repetitions: <b>${predictedReps}</b>\n\n${hitAllReps ? '🟢 Hit all reps last time' : '🔴 Didn\'t hit all reps last time'}`,
		{reply_markup: await getRepOptions(), parse_mode: 'HTML'},
	);

	let repetitions;

	const context = await conversation.waitFor(['callback_query:data', 'message:text']);
	if (context.callbackQuery?.data) {
		repetitions = predictedReps + Number(context.callbackQuery?.data);
	} else {
		repetitions = Number(context.message?.text);
	}

	return repetitions;
}

async function getRPE(ctx: MyContext, conversation: MyConversation, selectedExercise: string, setsCompletedIndicator: string) {
	await ctx.editMessageText(
		`<b>${selectedExercise} ${setsCompletedIndicator}</b>\n\nPlease enter the RPE\n\nHow hard was this set?`,
		{reply_markup: await getRpeOptions(), parse_mode: 'HTML'},

	);
	const {callbackQuery: {data: rpeData}} = await conversation.waitFor('callback_query:data');

	return Number(rpeData);
}

const recordSet = async (
	conversation: MyConversation,
	ctx: MyContext,
	selectedExercise: string,
	predictedWeight: number,
	predictedReps: number,
	hitAllReps: boolean,
) => {
	let canContinue = false;
	let setCount = 0;
	let updatedWorkout;

	do {
		const setsCompletedIndicator = '•'.repeat(setCount);

		const weight = await getWeight(ctx, conversation, selectedExercise, predictedWeight, hitAllReps, setsCompletedIndicator);
		const repetitions = await getRepetitions(ctx, conversation, selectedExercise, predictedReps, hitAllReps, setsCompletedIndicator);
		const rpe = await getRPE(ctx, conversation, selectedExercise, setsCompletedIndicator);

		// Record the set here
		const set = {
			user_id: ctx.dbchat.user_id,
			sets: [{exercise: selectedExercise, weight, repetitions, rpe}],
		};

		const payload = JSON.stringify(set);
		const response = await conversation.external(async () => updateWorkout(payload));

		if (!response.data) {
			throw new Error('Failed to record set to DB!');
		}

		setCount++;
		updatedWorkout = response.data;

		const replyKbd = new InlineKeyboard()
			.text('Finish', 'stopRecording')
			.text('+ One More', 'recordOneMore');

		await ctx.editMessageText(
			`<b>${selectedExercise} ${setsCompletedIndicator}</b>\n\n${weight} kgs x ${repetitions} @ ${rpe}RPE\n\n✅ Set was successfully recorded`,
			{reply_markup: replyKbd, parse_mode: 'HTML'},
		);

		const {callbackQuery: {data: buttonData}} = await conversation.waitFor('callback_query:data');

		if (buttonData === 'stopRecording') {
			canContinue = true;
		}
	} while (!canContinue);

	return updatedWorkout;
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

		// Const {message: {text: weightInput}} = await conversation.waitFor('message:text');
		const update = await conversation.waitFor('message:text');
		const weightInput = update.message.text;
		const weight = Number(weightInput);
		isInputValid = isNum(weight) && weight > 0 && weight < maxValue;

		validWeight = weight;

		iteration++;
	} while (!isInputValid);

	return validWeight;
};

const countSets = (setsArray: WorkoutType['sets']) => setsArray.reduce<Record<string, number>>((result, curr) => {
	if (curr.exercise in result) {
		result[curr.exercise]++;
	} else {
		result[curr.exercise] = 1;
	}

	return result;
}, {});

const averageRpe = (array: WorkoutType['sets']) => Number((array.reduce((total, set) => total + set.rpe, 0) / array.length).toFixed(1));

const getNextWorkout = (workouts: WorkoutType[], splitLength: number) => {
	const currentMesoStartIndex = workouts.findIndex(workout => workout.avg_rpe <= 6) - 1;
	const currentMesoWorkouts = workouts.slice(0, currentMesoStartIndex + 1);

	const workoutsBeforeCurrMeso = workouts.slice(currentMesoStartIndex + 1);
	const lastMesoEndIndex = workoutsBeforeCurrMeso.findIndex(workout => workout.avg_rpe > 6);
	const lastMesoStartIndex = workoutsBeforeCurrMeso.slice(lastMesoEndIndex).findIndex(workout => workout.avg_rpe <= 6);

	const lastMesoPlusDeload = workoutsBeforeCurrMeso.slice(lastMesoStartIndex);

	const hasOneMicro = currentMesoWorkouts.length >= splitLength;
	const workoutNumber = currentMesoWorkouts.length + 1;

	let nextWorkout: WorkoutType;

	if (hasOneMicro) {
		nextWorkout = currentMesoWorkouts[splitLength - 1];
		return {nextWorkout, currentMesoWorkouts, hasOneMicro, workoutNumber};
	}

	const workoutIndex = splitLength - currentMesoWorkouts.length;
	// Const nextWorkoutCandidate = lastMesoPlusDeload[workoutIndex - 1];
	nextWorkout = lastMesoPlusDeload[workoutIndex - 1];

	return {nextWorkout, currentMesoWorkouts, hasOneMicro, workoutNumber};
};

function getLastWorkoutSetData(selectedExercise: string, nextWorkout: WorkoutType, hasOneMicro: boolean) {
	let predictedWeight = 0;
	let predictedReps = 0;
	let hitAllReps = false;

	if (hasOneMicro) {
		const lastSet = nextWorkout.sets.find(set => set.exercise === selectedExercise)!;
		predictedWeight = lastSet.weight;
		predictedReps = lastSet.repetitions;
		hitAllReps = nextWorkout.sets.filter(set => set.exercise === selectedExercise).every(set => set.repetitions >= predictedReps);
	} else {
		const lastSet = nextWorkout.sets.find(set => set.exercise === selectedExercise)!;
		predictedWeight = lastSet.weight;
		predictedReps = lastSet.repetitions;
		hitAllReps = nextWorkout.sets.filter(set => set.exercise === selectedExercise).every(set => set.repetitions >= predictedReps);
	}

	return {predictedWeight, predictedReps, hitAllReps};
}

const handleNextWorkout = async (conversation: MyConversation, ctx: MyContext) => {
	const splitLength = 4;
	const mesocycleLength = 16;

	try {
		await ctx.answerCallbackQuery('start nextWorkout conversation');
		const {data: workouts} = await conversation.external(async () => getWorkouts(mesocycleLength));

		if (!workouts || (workouts.length < splitLength)) {
			throw new Error('Not enough data for projection');
		}

		const {nextWorkout, currentMesoWorkouts, hasOneMicro, workoutNumber} = getNextWorkout(workouts, splitLength);
		const nextWorkoutExercises = [...new Set(nextWorkout.sets.map(set => set.exercise))];
		const workoutTitle = `Workout ${currentMesoWorkouts.length + 1}<b>/${mesocycleLength}</b> of current mesocycle:`;

		// Start of the WORKOUT block
		// Send next workout list <<<==========
		let updatedCurrentWorkout: WorkoutType | Record<string, never> = {};
		let workoutFinished = false;

		const setCount = updatedCurrentWorkout.sets ? countSets(updatedCurrentWorkout.sets) : {};
		const kbdOptions = new InlineKeyboard();
		for (const exercise of nextWorkoutExercises) {
			kbdOptions
				.text(
					`${exercise} ${'•'.repeat(setCount[exercise])}`,
					exercise,
				)
				.row();
		}

		await ctx.editMessageText(
			workoutTitle,
			{reply_markup: kbdOptions, parse_mode: 'HTML'},
		);

		const {callbackQuery: {data: selectedExercise}} = await conversation.waitForCallbackQuery(nextWorkoutExercises);

		do {
			const {predictedWeight, predictedReps, hitAllReps} = getLastWorkoutSetData(selectedExercise, nextWorkout, hasOneMicro);

			if (typeof predictedWeight === 'undefined') {
				throw new Error('Not enough data for projection');
			}

			/// Start recording SETS of the chosen exercise
			updatedCurrentWorkout = await recordSet(conversation, ctx, selectedExercise, predictedWeight, predictedReps, hitAllReps);
			await ctx.editMessageText(
				'Would you like to finish this workout?',
				{reply_markup: await getYesNoOptions()},
			);

			const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(['noOption', 'yesOption']);

			if (data === 'yesOption') {
				workoutFinished = true;
			}
		} while (!workoutFinished);

		// Calculate the stats here and send in a message
		const {hours, minutes} = toHoursAndMins(updatedCurrentWorkout.durationInMinutes);
		const avgRpe = averageRpe(updatedCurrentWorkout.sets);

		const msgTextStats = `<b>Workout Stats</b>\n\nWorkout number: ${workoutNumber}<b>/${mesocycleLength}</b>\nTotal duration: <b>${hours}h ${minutes}min</b>\nAverage RPE: <b>${avgRpe}</b>`;

		await ctx.editMessageText(msgTextStats, {parse_mode: 'HTML'});
	} catch (err: unknown) {
		console.log(err);
	}
};

composer
	.use(createConversation(handleNextWorkout));

composer.callbackQuery('/next_workout', async ctx => {
	await ctx.conversation.enter('handleNextWorkout');
});

export default composer;
