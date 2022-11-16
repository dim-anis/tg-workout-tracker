import axios from 'axios';
import type {AxiosResponse} from 'axios';
import type {IExercise} from '../models/exercise';
import {generateMenu} from '../utils/utils';
import {
	type Conversation,
} from '@grammyjs/conversations';
import type {MyContext} from '../bot';

type MyConversation = Conversation<MyContext>;

const getExerciseChoice = async (
	conversation: MyConversation,
	ctx: MyContext,
	exercises: IExercise[],
	exerciseCategory: string,
	opts: {chatId: number; messageId: number;
	}) => {
	const exercisesByCategory = exercises.filter(item => item.category === exerciseCategory).map(item => item.name);
	const exerciseMenu = generateMenu(exercisesByCategory, {addBackButton: true});
	await ctx.api.editMessageText(opts.chatId, opts.messageId, 'Choose an exercise:', {reply_markup: exerciseMenu});

	const {callbackQuery: cbExercise} = await conversation.waitFor('callback_query:data');
	await ctx.api.answerCallbackQuery(cbExercise.id, {text: `You chose ${cbExercise.data}`});
	return cbExercise.data;
};

const getValidInput = async (conversation: MyConversation, ctx: MyContext) => {
	const errors = {
		nonNumericValues: 'only numeric characters are allowed',
		invalidLength: 'three values are expected',
		negativeValue: 'only positive values are allowed',
	};

	let isInputValid = false;
	let isThreeValues = false;
	let isNumeric = false;
	let isPositive = false;

	let values;
	let iteration = 0;

	do {
		if (iteration > 0) {
			if (!isThreeValues) {
				await ctx.reply(`❌ There was an error: ${errors.invalidLength}`);
			}

			if (!isNumeric) {
				await ctx.reply(`❌ There was an error: ${errors.nonNumericValues}`);
			}

			if (!isPositive && isNumeric) {
				await ctx.reply(`❌ There was an error: ${errors.negativeValue}`);
			}
		}

		const isNum = (value: number) => typeof value === 'number' && !Number.isNaN(value);

		const {message} = await conversation.waitFor('message:text');
		const valuesArray = message.text.split(' ').filter(value => value.trim()).map(value => Number(value));
		console.log(valuesArray);
		isThreeValues = valuesArray.length === 3;
		isPositive = valuesArray.every(value => isNum(value) && value > 0);
		isNumeric = valuesArray.every(value => isNum(value));
		isInputValid = isThreeValues && isNumeric && isPositive;

		values = valuesArray;

		iteration += 1;
	} while (!isInputValid);

	return values;
};

const handleRecordSet = async (conversation: MyConversation, ctx: MyContext) => {
	try {
		const response = await conversation.external(async () => axios.get<AxiosResponse<IExercise[]>>('http://localhost:5000/exercises').then(response => response.data));
		const {data: exercises} = response;
		const categories = [...new Set(exercises.map(item => item.category))];
		const categoryMenu = generateMenu(categories);
		const message = await ctx.reply('Choose a category:', {reply_markup: categoryMenu});
		const {callbackQuery: cbCategory} = await conversation.waitFor('callback_query:data');
		await ctx.api.answerCallbackQuery(cbCategory.id, {text: `You chose ${cbCategory.data}`});

		const chatId = message.chat.id;
		const messageId = message.message_id;
		let category = cbCategory.data;
		let iteration = 0;
		let canContinue = false;
		let exercise;

		do {
			if (iteration > 0) {
				await ctx.api.editMessageText(chatId, messageId, 'Choose a category:', {reply_markup: categoryMenu});
				const {callbackQuery: cbCategory} = await conversation.waitFor('callback_query:data');
				await ctx.api.answerCallbackQuery(cbCategory.id, {text: `You chose ${cbCategory.data}`});
				category = cbCategory.data;

				const selectedOption = await getExerciseChoice(conversation, ctx, exercises, category, {chatId, messageId});

				if (selectedOption !== '≪ Back') {
					exercise = selectedOption;
					canContinue = true;
				}
			} else {
				const selectedOption = await getExerciseChoice(conversation, ctx, exercises, category, {chatId, messageId});

				if (selectedOption !== '≪ Back') {
					exercise = selectedOption;
					canContinue = true;
				}
			}

			iteration++;
		} while (!canContinue);

		if (exercise) {
			await ctx.api.editMessageText(
				message.chat.id,
				message.message_id,
				`${exercise}\n\nType in the weight, num of reps and RPE without units separated by whitespace\n\nExample:\n\n100 10 7.5`);
		}

		const inputArray = await getValidInput(conversation, ctx);
		await ctx.reply('✅ Success!');
	} catch (err: unknown) {
		console.error(err);
	}
};

export default handleRecordSet;
