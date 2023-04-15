/* eslint-disable no-await-in-loop */
import {Composer, InlineKeyboard} from 'grammy';
import {createConversation} from '@grammyjs/conversations';
import type {MyConversation, MyContext} from '../types/bot';
import {getRpeOptions, getRepOptions, getWeightOptions, getYesNoOptions, checkedButton} from '../config/keyboards';
import {type WorkoutType} from '../models/workout';
import {countSets, getWorkoutStatsText} from './helpers/workoutStats';
import {isSameDay} from 'date-fns';
import {createOrUpdateUserWorkout} from '../models/user';
import {userHasEnoughWorkouts} from '../middleware/userHasEnoughWorkouts';
import {promptUserForWeight, promptUserForRepetitions, promptUserForRPE, promptUserForYesNo} from './helpers/promptUser';

const composer = new Composer<MyContext>();

const handleNextWorkout = async (conversation: MyConversation, ctx: MyContext) => {
	if (!ctx.chat) {
		return;
	}

	const {id: chat_id} = ctx.chat;
	const {splitLength, isMetric} = ctx.dbchat.settings;
	const {recentWorkouts} = ctx.dbchat;

	try {
		const workoutCount = calculateWorkoutCount(recentWorkouts);
		const isSameDayWorkout = isSameDay(recentWorkouts[0]?.createdAt, Date.now());

		const previousWorkout = getPreviousWorkout(recentWorkouts, splitLength);
		const previousWorkoutExercises = [...new Set(previousWorkout.sets.map(set => set.exercise))];
		const workoutTitle = `<b>Workout #${workoutCount} of Current Mesocycle</b>\n\n<i>Select an exercise:</i>`;

		let updatedCurrentWorkout: WorkoutType | Record<string, never> = {};
		let workoutFinished = false;

		do {
			const todaysSetCountMap = isSameDayWorkout ? countSets(recentWorkouts[0].sets) : {};
			const setCountMap = updatedCurrentWorkout.sets ? countSets(updatedCurrentWorkout.sets) : todaysSetCountMap;
			const exerciseOptions = new InlineKeyboard();

			for (const exerciseName of previousWorkoutExercises) {
				exerciseOptions
					.text(
						`${exerciseName} ${'•'.repeat(setCountMap[exerciseName])}`,
						exerciseName,
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

			const exerciseParams = {selectedExercise, previousWeight, previousReps, hitAllReps};

			updatedCurrentWorkout = await recordExercise(conversation, ctx, chat_id, message_id, exerciseParams);

			const finishWorkoutText = 'Would you like to finish this workout?';
			const finishWorkoutOptions = {reply_markup: await getYesNoOptions('nextWorkout')};
			const finishWorkout = await promptUserForYesNo(ctx, conversation, chat_id, message_id, finishWorkoutText, finishWorkoutOptions);

			workoutFinished = (finishWorkout === 'yes');
		} while (!workoutFinished);

		// Calculate the stats here and send in a message
		const workoutStatsText = getWorkoutStatsText(updatedCurrentWorkout, workoutCount);
		await ctx.api.editMessageText(
			chat_id,
			ctx.session.state.lastMessageId,
			workoutStatsText,
			{parse_mode: 'HTML'},
		);
	} catch (err: unknown) {
		console.log(err);
	}
};

async function getWeight(ctx: MyContext, conversation: MyConversation, chat_id: number, message_id: number, selectedExercise: string, previousWeight: number, hitAllReps: boolean, setCount: number) {
	const weightText = `<b>${selectedExercise.toUpperCase()} ${checkedButton.repeat(setCount)}</b>\n\n`
	+ 'Please enter the weight\n\n'
	+ `Last working weight: <b>${previousWeight}kg</b>\n\n`
	+ `${hitAllReps ? '✅' : '❌ didn\'t'} hit all reps last time`;

	const options = {reply_markup: await getWeightOptions(previousWeight, 'nextWorkout'), parse_mode: 'HTML'};

	return promptUserForWeight(ctx, conversation, chat_id, message_id, weightText, options);
}

async function getRepetitions(ctx: MyContext, conversation: MyConversation, chat_id: number, message_id: number, selectedExercise: string, previousReps: number, hitAllReps: boolean, setCount: number) {
	const repetitionsText = `<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\n`
	+ 'Please enter the repetitions\n\n'
	+ `Expected number of repetitions: <b>${previousReps}</b>\n\n`
	+ `${hitAllReps ? '✅' : '❌ didn\'t'} hit all reps last time`;

	const options = {reply_markup: await getRepOptions(previousReps, 'nextWorkout'), parse_mode: 'HTML'};

	return promptUserForRepetitions(ctx, conversation, chat_id, message_id, repetitionsText, options);
}

async function getRPE(ctx: MyContext, conversation: MyConversation, chat_id: number, message_id: number, selectedExercise: string, setCount: number) {
	const rpeText = `<b>${selectedExercise.toUpperCase()} ${'•'.repeat(setCount)}</b>\n\n`
	+ 'Please enter the RPE\n\nHow hard was this set?';

	const options = {reply_markup: await getRpeOptions('nextWorkout'), parse_mode: 'HTML'};

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

type RecordExerciseParams = {
	selectedExercise: string;
	previousWeight: number;
	previousReps: number;
	hitAllReps: boolean;
};

async function recordExercise(
	conversation: MyConversation,
	ctx: MyContext,
	chat_id: number,
	message_id: number,
	exerciseParams: RecordExerciseParams,
): Promise<WorkoutType> {
	const {selectedExercise, previousWeight, previousReps, hitAllReps} = exerciseParams;

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

		await ctx.api.editMessageText(
			chat_id,
			message_id,
			`<b>${selectedExercise} ${'•'.repeat(setCount)}</b>\n\n`
			+ `${weight} kgs x ${repetitions} @ ${rpe}RPE\n\n`
			+ '✅ Set was successfully recorded',
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

	if (workoutCandidate.isDeload) {
		workoutNumber = recentWorkouts.findIndex(workout => !workout.isDeload);
		workoutNumber = workoutNumber === -1 ? splitLength - 1 : workoutNumber;
	}

	if (isSameWorkout) {
		workoutNumber += 1;
	}

	if (workoutNumber === splitLength - 1) {
		// Throw new Error('No deload workout found');
		return recentWorkouts[workoutNumber];
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

function findMesoStartIndex(workouts: WorkoutType[]) {
  const deloadIndex = workouts.findIndex(workout => workout.isDeload);
	return deloadIndex !== -1 ? deloadIndex - 1 : undefined;
}

const calculateWorkoutCount = (workouts: WorkoutType[]) => {
  const deloadIndex = workouts.findIndex((w) => w.isDeload);
  const start = deloadIndex === -1 ? 0 : deloadIndex + 1;
  const count = workouts.slice(start).length;
  return count + 1;
};

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
