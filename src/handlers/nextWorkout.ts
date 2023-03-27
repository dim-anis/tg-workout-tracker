/* eslint-disable no-await-in-loop */
import {Composer, InlineKeyboard} from 'grammy';
import intervalToDuration from 'date-fns/intervalToDuration';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getRpeOptions, getRepOptions, getWeightOptions, getYesNoOptions} from '../config/keyboards';
import {type WorkoutType, getWorkouts, createOrUpdateWorkout} from '../models/workout';
import {countSets, averageRpe} from './helpers/countSets';
import {isSameDay} from 'date-fns';

const composer = new Composer<MyContext>();

const handleNextWorkout = async (conversation: MyConversation, ctx: MyContext) => {
	const {splitLength, isMetric} = conversation.session.userSettings;
	// Make it an option in the settings
	const mesocycleLength = splitLength * 4;

	try {
		const workouts = await conversation.external(async () => getWorkouts(mesocycleLength));

		if (workouts.length < splitLength) {
			throw new Error('Not enough data for projection');
		}

		const firstWorkoutThisMesoIndex = workouts.findIndex(workout => workout.avg_rpe <= 6) + 1;
		const workoutNumber = isSameDay(workouts[0].createdAt, new Date()) ? firstWorkoutThisMesoIndex - 1 : firstWorkoutThisMesoIndex;
		const hasOneMicro = workoutNumber > splitLength;

		const nextWorkout = getNextWorkout(workouts, splitLength);
		const nextWorkoutExercises = [...new Set(nextWorkout.sets.map(set => set.exercise))];
		const workoutTitle = `<b>WORKOUT [ ${workoutNumber} / ${mesocycleLength} ] of CURRENT MESOCYCLE</b>\n\n<i>Select an exercise:</i>`;

		let updatedCurrentWorkout: WorkoutType | Record<string, never> = {};
		let workoutFinished = false;
		const setCountMap = updatedCurrentWorkout.sets ? countSets(updatedCurrentWorkout?.sets) : {};

		do {
			const kbdOptions = new InlineKeyboard();
			for (const exercise of nextWorkoutExercises) {
				kbdOptions
					.text(
						`${exercise} ${'•'.repeat(setCountMap[exercise])}`,
						exercise,
					)
					.row();
			}

			await ctx.editMessageText(
				workoutTitle,
				{reply_markup: kbdOptions, parse_mode: 'HTML'},
			);

			const {callbackQuery: {data: selectedExercise}} = await conversation.waitForCallbackQuery(nextWorkoutExercises);
			const {lastWeight, lastReps, hitAllReps} = getLastWorkoutSetData(selectedExercise, nextWorkout);

			if (typeof lastWeight === 'undefined') {
				throw new Error('Not enough data for projection');
			}

			updatedCurrentWorkout = await recordExercise(conversation, ctx, selectedExercise, lastWeight, lastReps, hitAllReps);

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
		const {createdAt, updatedAt} = updatedCurrentWorkout;
		const {hours, minutes} = intervalToDuration({
			start: new Date(createdAt),
			end: new Date(updatedAt),
		});
		const avgRpe = averageRpe(updatedCurrentWorkout.sets);
		const msgTextStats = `<b>Workout Stats</b>\n\nWorkout number: ${workoutNumber}<b>/${mesocycleLength}</b>\nTotal duration: <b>${hours ? `${hours}h` : ''} ${minutes ? `${minutes}min` : ''}</b>\nAverage RPE: <b>${avgRpe}</b>`;

		await ctx.editMessageText(msgTextStats, {parse_mode: 'HTML'});
	} catch (err: unknown) {
		console.log(err);
	}
};

async function getWeight(ctx: MyContext, conversation: MyConversation, selectedExercise: string, lastWeight: number, hitAllReps: boolean, setCount: number) {
	await ctx.editMessageText(
		`<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\nPlease enter the weight\n\nLast working weight: <b>${lastWeight}kg</b>\n\n${hitAllReps ? '🟢' : '🔴 didn\'t'} hit all reps last time`,
		{reply_markup: await getWeightOptions(), parse_mode: 'HTML'},
	);

	ctx = await conversation.waitFor(['message:text', 'callback_query:data']);
	if (ctx.callbackQuery) {
		return lastWeight + Number(ctx.callbackQuery.data);
	}

	await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id);
	return Number(ctx.message!.text);
}

async function getRepetitions(ctx: MyContext, conversation: MyConversation, selectedExercise: string, lastReps: number, hitAllReps: boolean, setCount: number) {
	await ctx.editMessageText(
		`<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\nPlease enter the repetitions\n\nExpected number of repetitions: <b>${lastReps}</b>\n\n${hitAllReps ? '🟢' : '🔴 didn\'t'} hit all reps last time`,
		{reply_markup: await getRepOptions(), parse_mode: 'HTML'},
	);

	ctx = await conversation.waitFor(['message:text', 'callback_query:data']);
	if (ctx.callbackQuery) {
		return lastReps + Number(ctx.callbackQuery.data);
	}

	await ctx.api.deleteMessage(ctx.chat!.id, ctx.message!.message_id);
	return Number(ctx.message?.text);
}

async function getRPE(ctx: MyContext, conversation: MyConversation, selectedExercise: string, setCount: number) {
	await ctx.editMessageText(
		`<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\nPlease enter the RPE\n\nHow hard was this set?`,
		{reply_markup: await getRpeOptions(), parse_mode: 'HTML'},

	);
	const {callbackQuery: {data: rpeData}} = await conversation.waitFor('callback_query:data');

	return Number(rpeData);
}

async function recordSet(
	conversation: MyConversation,
	ctx: MyContext,
	selectedExercise: string,
	lastWeight: number,
	lastReps: number,
	hitAllReps: boolean,
	setCount: number,
) {
	const weight = await getWeight(ctx, conversation, selectedExercise, lastWeight, hitAllReps, setCount);
	const repetitions = await getRepetitions(ctx, conversation, selectedExercise, lastReps, hitAllReps, setCount);
	const rpe = await getRPE(ctx, conversation, selectedExercise, setCount);

	return conversation.external(async () => createOrUpdateWorkout(ctx.dbchat.user_id, {exercise: selectedExercise, weight, repetitions, rpe}));
}

async function recordExercise(
	conversation: MyConversation,
	ctx: MyContext,
	selectedExercise: string,
	lastWeight: number,
	lastReps: number,
	hitAllReps: boolean,
) {
	let canContinue = false;
	let updatedWorkout;
	let setCount = 0;

	do {
		updatedWorkout = await recordSet(conversation, ctx, selectedExercise, lastWeight, lastReps, hitAllReps, setCount);

		if (typeof updatedWorkout === 'undefined') {
			throw new Error('Failed to record set to DB!');
		}

		setCount = countSets(updatedWorkout.sets)[selectedExercise];
		const {weight, repetitions, rpe} = updatedWorkout.sets[updatedWorkout.sets.length - 1];

		const replyKbd = new InlineKeyboard()
			.text('Finish', 'stopRecording')
			.text('+ One More', 'recordOneMore');

		await ctx.editMessageText(
			`<b>${selectedExercise} ${'•'.repeat(setCount)}</b>\n\n${weight} kgs x ${repetitions} @ ${rpe}RPE\n\n✅ Set was successfully recorded`,
			{reply_markup: replyKbd, parse_mode: 'HTML'},
		);

		const {callbackQuery: {data: buttonData}} = await conversation.waitFor('callback_query:data');

		if (buttonData === 'stopRecording') {
			canContinue = true;
		}
	} while (!canContinue);

	return updatedWorkout;
}

function getNextWorkout(workouts: WorkoutType[], splitLength: number) {
	const isSameWorkout = isSameDay(workouts[0].createdAt, new Date());

	if (isSameWorkout) {
		return workouts[0];
	}

	const step = splitLength - 1;
	const workoutCandidate = workouts[step];

	// Filtering out the deload workouts and getting the last proper workout
	if (workoutCandidate.avg_rpe <= 6) {
		for (let i = 0; i < workouts.length; i + step) {
			if (workouts[i].avg_rpe <= 6) {
				continue;
			}

			return workouts[i];
		}
	}

	return workoutCandidate;
}

function getLastWorkoutSetData(selectedExercise: string, nextWorkout: WorkoutType) {
	const allSets = nextWorkout.sets.filter(set => set.exercise === selectedExercise);
	const lastWeight = allSets[allSets.length - 1].weight;
	const lastReps = allSets[allSets.length - 1].repetitions;
	const hitAllReps = allSets.every(set => set.repetitions >= lastReps);

	return {lastWeight, lastReps, hitAllReps};
}

composer
	.use(createConversation(handleNextWorkout));

composer.callbackQuery('/next_workout', async ctx => {
	await ctx.conversation.enter('handleNextWorkout');
});

export default composer;
