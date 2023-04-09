/* eslint-disable no-await-in-loop */
import {Composer, InlineKeyboard} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getRpeOptions, getRepOptions, getWeightOptions, getYesNoOptions} from '../config/keyboards';
import {type WorkoutType} from '../models/workout';
import {countSets, getWorkoutStatsText} from './helpers/workoutStats';
import {isSameDay} from 'date-fns';
import {createOrUpdateUserWorkout} from '../models/user';
import {userHasEnoughWorkouts} from '../middleware/userHasEnoughWorkouts';
import {promptUserForWeight, promptUserForRepetitions, promptUserForRPE} from './helpers/promptUser';

const composer = new Composer<MyContext>();

const handleNextWorkout = async (conversation: MyConversation, ctx: MyContext) => {
	if (!ctx.chat) {
		return;
	}

	const {id: chat_id} = ctx.chat;
	const {splitLength, isMetric} = conversation.session.userSettings;
	const {recentWorkouts} = ctx.dbchat;
	// Make it an option in the settings
	const mesocycleLength = splitLength * 4;

	try {
		const isSameDayWorkout = isSameDay(recentWorkouts[0]?.createdAt && recentWorkouts[0].createdAt, new Date());
		const firstWorkoutThisMesoIndex = recentWorkouts.findIndex(workout => workout.avg_rpe <= 6) + 1;
		const workoutNumber = isSameDayWorkout ? firstWorkoutThisMesoIndex - 1 : firstWorkoutThisMesoIndex;
		const hasOneMicro = workoutNumber > splitLength;

		const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength);
		const previousWorkoutExercises = [...new Set(previousWorkout.sets.map(set => set.exercise))];
		const workoutTitle = `<b>WORKOUT [ ${workoutNumber} / ${mesocycleLength} ] of CURRENT MESOCYCLE</b>\n\n<i>Select an exercise:</i>`;

		let updatedCurrentWorkout: WorkoutType | Record<string, never> = {};
		let workoutFinished = false;

		do {
			const todaysSetCountMap = isSameDayWorkout ? countSets(recentWorkouts[0].sets) : {};
			const setCountMap = updatedCurrentWorkout.sets ? countSets(updatedCurrentWorkout.sets) : todaysSetCountMap;
			const exerciseOptions = new InlineKeyboard();

			for (const exercise of previousWorkoutExercises) {
				exerciseOptions
					.text(
						`${exercise} ${'•'.repeat(setCountMap[exercise])}`,
						exercise,
					)
					.row();
			}

			const {message_id} = await ctx.reply(
				workoutTitle,
				{reply_markup: exerciseOptions, parse_mode: 'HTML'},
			);

			ctx.session.state.lastMessageId = message_id;

			const {callbackQuery: {data: selectedExercise}} = await conversation.waitForCallbackQuery(previousWorkoutExercises);
			const {previousWeight, previousReps, hitAllReps} = getPreviousWorkoutSetData(selectedExercise, previousWorkout);

			updatedCurrentWorkout = await recordExercise(conversation, ctx, chat_id, message_id, selectedExercise, previousWeight, previousReps, hitAllReps);

			await ctx.editMessageText(
				'Would you like to finish this workout?',
				{reply_markup: await getYesNoOptions()},
			);

			const {callbackQuery: {data}} = await conversation.waitForCallbackQuery(['noOption', 'yesOption']);

			workoutFinished = (data === 'yesOption');
		} while (!workoutFinished);

		// Calculate the stats here and send in a message
		const workoutStatsText = getWorkoutStatsText(updatedCurrentWorkout, workoutNumber, mesocycleLength);
		await ctx.editMessageText(workoutStatsText, {parse_mode: 'HTML'});
	} catch (err: unknown) {
		console.log(err);
	}
};

async function getWeight(ctx: MyContext, conversation: MyConversation, chat_id: number, message_id: number, selectedExercise: string, previousWeight: number, hitAllReps: boolean, setCount: number) {
	const weightText = `<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\n`
	+ 'Please enter the weight\n\n'
	+ `Last working weight: <b>${previousWeight}kg</b>\n\n`
	+ `${hitAllReps ? '🟢' : '🔴 didn\'t'} hit all reps last time`;

	const options = {reply_markup: await getWeightOptions(), parse_mode: 'HTML'};

	return promptUserForWeight(ctx, conversation, chat_id, message_id, weightText, options);
}

async function getRepetitions(ctx: MyContext, conversation: MyConversation, chat_id: number, message_id: number, selectedExercise: string, previousReps: number, hitAllReps: boolean, setCount: number) {
	const repetitionsText = `<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\n`
	+ 'Please enter the repetitions\n\n'
	+ `Expected number of repetitions: <b>${previousReps}</b>\n\n`
	+ `${hitAllReps ? '🟢' : '🔴 didn\'t'} hit all reps last time`;

	const options = {reply_markup: await getRepOptions(), parse_mode: 'HTML'};

	return promptUserForRepetitions(ctx, conversation, chat_id, message_id, repetitionsText, options);
}

async function getRPE(ctx: MyContext, conversation: MyConversation, chat_id: number, message_id: number, selectedExercise: string, setCount: number) {
	const rpeText = `<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\n`
	+ 'Please enter the RPE\n\nHow hard was this set?';

	const options = {reply_markup: await getRpeOptions(), parse_mode: 'HTML'};

	return promptUserForRPE(ctx, conversation, chat_id, message_id, rpeText, options);
}

async function recordSet(
	conversation: MyConversation,
	ctx: MyContext,
	chat_id: number,
	message_id: number,
	selectedExercise: string,
	lastWeight: number,
	lastReps: number,
	hitAllReps: boolean,
	setCount: number,
): Promise<WorkoutType> {
	const weight = await getWeight(ctx, conversation, chat_id, message_id, selectedExercise, lastWeight, hitAllReps, setCount);
	const repetitions = await getRepetitions(ctx, conversation, chat_id, message_id, selectedExercise, lastReps, hitAllReps, setCount);
	const rpe = await getRPE(ctx, conversation, chat_id, message_id, selectedExercise, setCount);

	const updatedWorkout = conversation.external(async () => createOrUpdateUserWorkout(ctx.dbchat.user_id, {exercise: selectedExercise, weight, repetitions, rpe}));

	return updatedWorkout;
}

async function recordExercise(
	conversation: MyConversation,
	ctx: MyContext,
	chat_id: number,
	message_id: number,
	selectedExercise: string,
	previousWeight: number,
	previousReps: number,
	hitAllReps: boolean,
): Promise<WorkoutType> {
	let canContinue = false;
	let updatedWorkout;
	let setCount = 0;

	do {
		updatedWorkout = await recordSet(conversation, ctx, chat_id, message_id, selectedExercise, previousWeight, previousReps, hitAllReps, setCount);

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

		const {callbackQuery: {data}} = await conversation.waitFor('callback_query:data');

		canContinue = (data === 'stopRecording');
	} while (!canContinue);

	return updatedWorkout;
}

function getPreviousWorkout(recentWorkouts: WorkoutType[], splitLength: number) {
	const isSameWorkout = isSameDay(recentWorkouts[0].createdAt, new Date());
	let workoutNumber = splitLength - 1;
	const workoutCandidate = recentWorkouts[workoutNumber];

	// TODO: refactor the model and add 'isDeload' field instead of ambiguous avg_rpe <= 6
	if (workoutCandidate.avg_rpe <= 6) {
		workoutNumber = recentWorkouts.findIndex(workout => workout.avg_rpe > 6);
		workoutNumber = workoutNumber === -1 ? splitLength - 1 : workoutNumber;
	}

	if (isSameWorkout) {
		workoutNumber += 1;
	}

	if (workoutNumber === splitLength - 1) {
		throw new Error('No deload workout found');
	}

	return recentWorkouts[workoutNumber];
}

function getPreviousWorkoutSetData(selectedExercise: string, previousWorkout: WorkoutType) {
	const allSets = previousWorkout.sets.filter(set => set.exercise === selectedExercise);

	// Exercise '${selectedExercise}' was not performed in the previous workout
	if (allSets.length === 0) {
		return {previousWeight: 0, previousReps: 0, hitAllReps: true};
	}

	const previousWeight = allSets[allSets.length - 1].weight;
	const previousReps = allSets[allSets.length - 1].repetitions;
	const hitAllReps = allSets.every(set => set.repetitions >= previousReps);

	return {previousWeight, previousReps, hitAllReps};
}

composer
	.use(createConversation(handleNextWorkout));

composer
	.callbackQuery(
		'/next_workout',
		userHasEnoughWorkouts,
		async ctx => ctx.conversation.enter('handleNextWorkout'));
composer
	.command(
		'next_workout',
		userHasEnoughWorkouts,
		async ctx => ctx.conversation.enter('handleNextWorkout'));

export default composer;
