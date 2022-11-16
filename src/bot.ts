import type {Context, SessionFlavor} from 'grammy';
import dotenv from 'dotenv';
import {Bot, session, GrammyError, HttpError} from 'grammy';
import type {ConversationFlavor} from '@grammyjs/conversations';
import {conversations, createConversation} from '@grammyjs/conversations';
import handleRecordSet from './conversations/recordSet';
import handleNextWorkout from './conversations/nextWorkout';
import {AxiosError} from 'axios';
import commands from '../src/config/botCommands';
import {generateMenu} from './utils/utils';

dotenv.config();

type SessionStorage = {
	messageId: number;
	chatId: number;
};

export type MyContext = Context & ConversationFlavor & SessionFlavor<SessionStorage>;

const bot = new Bot<MyContext>(process.env.KEY!);

function initial(): SessionStorage {
	return {
		messageId: 0,
		chatId: 0,
	};
}

await bot.api.setMyCommands(commands);

bot.use(session({initial}));
bot.use(conversations());
bot.use(createConversation(handleRecordSet));
bot.use(createConversation(handleNextWorkout));

bot.catch(err => {
	const {ctx} = err;
	console.error(`Error while handling update ${ctx.update.update_id}:`);
	const e = err.error;
	if (e instanceof GrammyError) {
		console.error('Error in request:', e.description);
	} else if (e instanceof HttpError) {
		console.error('Could not contact Telegram:', e);
	} else if (e instanceof AxiosError) {
		console.error('Axios error');
	}	else {
		console.error('Unknown error:', e);
	}
});

bot.command('start', async ctx => {
	const buttons = commands.slice(1).map(command => `${command.command}`);
	const menu = generateMenu(buttons);
	await ctx.reply('Choose an option:', {reply_markup: menu});
});

bot.on('callback_query:data', async ctx => {
	const {data: command, id} = ctx.callbackQuery;
	switch (command) {
		case '/record_set':
			await ctx.api.answerCallbackQuery(id);
			await ctx.conversation.enter('handleRecordSet');
			break;
		case '/next_workout':
			await ctx.api.answerCallbackQuery(id);
			await ctx.conversation.enter('handleNextWorkout');
			break;
		default:
			await ctx.api.answerCallbackQuery(id);
			await ctx.reply(`Sorry, I don't know what ${command} means`);
	}
});

export default bot;

// Const commandRegExp = /^\/[a-z]+$/i;
// const messageRegExp = /^[a-zA-Z\s]+$/;

// Bot.onText(commandRegExp, async msg => {
// 	const botCommand = msg.text;
// 	const chatId = msg.chat.id;
// 	switch (botCommand) {
// 		case '/start':
// 			service.send('START');
// 			await bot.sendMessage(chatId, `You chose ${botCommand} Bot command`);
// 			try {
// 				const response = await axios.get<AxiosResponse<IExercise[]>>('http://localhost:5000/exercises');
// 				const {data: {data: exerciseList}} = response;
// 				const exerciseNames = exerciseList.map(item => item.name);
// 				const kbdOptions = generateKeyboard(exerciseNames);
// 				await bot.sendMessage(
// 					chatId,
// 					'Choose an exercise: ',
// 					{
// 						reply_markup: {
// 							inline_keyboard: kbdOptions,
// 						},
// 					});
// 				await bot.deleteMessage(chatId, msg.message_id.toString());
// 			} catch (err: unknown) {
// 				console.log(err);
// 			}

// 			break;
// 		default:
// 			await bot.sendMessage(chatId, `Sorry, I don't know what ${botCommand!} means yet`);
// 	}
// });

// bot.on('callback_query', async query => {
// 	const data = query.data!;
// 	const msgId = query.message?.message_id;
// 	const chatId = query.message?.chat.id;
// 	await bot.answerCallbackQuery(query.id);
// 	await bot.editMessageText(`${data}\n\nType in the weight, num of reps and RPE without units separated by " "\n\nExample:\n\n100 10 7.5`, {chat_id: chatId, message_id: msgId});
// });

// bot.onText(messageRegExp, async msg => {
// 	const message = msg.text!;
// 	const chatId = msg.chat.id;

// 	await bot.sendMessage(chatId, `I have received a message: ${message}`);
// });

// Bot.on('message', async msg => {
// 	const chatId = msg.chat.id;
// 	const message = msg.text;

// 	if (message === '/record_set') {
// 		try {
// 			const response = await axios.get<AxiosResponse<IExercise[]>>('http://localhost:5000/exercises');
// 			const {data: {data: exerciseList}} = response;
// 			const exerciseNames = exerciseList.map(item => item.name);
// 			const kbdOptions = generateKeyboardOptions(exerciseNames);
// 			await bot.sendMessage(
// 				chatId,
// 				'Choose an exercise: ',
// 				{
// 					reply_markup: {
// 						inline_keyboard: kbdOptions,
// 					},
// 				});
// 			await bot.deleteMessage(chatId, msg.message_id.toString());

// 			bot.once('callback_query', async query => {
// 				await bot.answerCallbackQuery(query.id);
// 				const exercise = query.data!;

// 				await bot.sendMessage(chatId,
// 					`${exercise}\n\nType in the weight, num of reps and RPE without units separated by " "\n\nExample:\n\n100 10 7.5`,
// 				);

// 				bot.once('message', async msg => {
// 					const stringValues = msg.text?.split(' ');
// 					if (typeof stringValues === 'undefined' || stringValues.length < 3) {
// 						throw new BaseError(400, 'Please type all three values separated by space \' \'\n\nE.g.: 100 10 7.5');
// 					}

// 					const intValues = stringValues.map(value => parseFloat(value));

// 					if (intValues.some(value => isNaN(value))) {
// 						throw new BaseError(400, 'Only numbers are allowed!');
// 					}

// 					const [weight, repetitions, rpe] = intValues;
// 					const currentDate = new Date();
// 					const set = {
// 						user: 'Jack',
// 						createdAt: currentDate,
// 						sets: [{exercise, weight, repetitions, rpe}],
// 					};
// 					const response = await axios.put<IWorkout>('http://localhost:5000/workouts', JSON.stringify(set), {
// 						headers: {
// 							'Content-Type': 'application/json',
// 						},
// 					});
// 					await bot.sendMessage(chatId, `Successfully recorded a set of ${exercise}`);
// 				});
// 			});
// 		} catch (err: unknown) {
// 			console.log(err instanceof BaseError);
// 			if (err instanceof BaseError) {
// 				console.log(err.statusCode);
// 			}
// 		}
// 	}
// /*
// 	If (message?.split(' ')[0] === '/show_last_workout') {
// 		const nToLast = message.split(' ')[1];
// 		bot.deleteMessage(chatId, msg.message_id.toString());
// 		try {
// 			const response = await axios.get<IWorkout[]>(`http://localhost:5000/workouts?nToLast=${nToLast}`);
// 			const {data: workoutList} = response;
// 			const lastWorkout = workoutList.at(-1);
// 			if (!lastWorkout) {
// 				return;
// 			}

// 			const lastWorkoutSets = lastWorkout.sets;
// 			const timeSinceLastWorkout = formatDistanceToNow(new Date(lastWorkoutSets[0].createdAt));

// 			const messageString = `Last workout from *${timeSinceLastWorkout} ago:*\n\n`;
// 			const hintMessage = '* to see nth-last workout type:\n\n/show_last_workout followed by a space and a number\n\nExample: /show_last_workout 2';

// 			const lastWorkoutMessage = lastWorkoutSets.reduce((acc, set) => {
// 				const {rpe, exercise, weight, repetitions} = set;
// 				return acc + `${addRPEColor(rpe)} ${exercise} - ${weight} x ${repetitions}\n`;
// 			}, messageString);
// 			console.log(lastWorkoutMessage);
// 			const kbdOptions = generateKeyboardOptions(['❌'], 'closeLastWorkoutStats');
// 			await bot.sendMessage(chatId, lastWorkoutMessage, {
// 				parse_mode: 'Markdown',
// 				reply_markup: {inline_keyboard: kbdOptions},
// 			});
// 			await bot.sendMessage(chatId, hintMessage);
// 		} catch (err: unknown) {
// 			const error = err as Error | AxiosError;
// 			if (!axios.isAxiosError(error)) {
// 				bot.sendMessage(chatId, `An unexpected error occured. Error details: ${error.message}`);
// 			} else if (!error.response) {
// 				bot.sendMessage(chatId, 'No server response');
// 			} else if (error.response.status === 404) {
// 				bot.sendMessage(chatId, 'Invalid URL');
// 			} else if (error.response.status === 400) {
// 				const message = error.response?.data.message;
// 				bot.sendMessage(chatId, message);
// 			} else {
// 				bot.sendMessage(chatId, 'Failed to fetch workout list');
// 			}
// 		}
// 	}

// 	if (message === '/start') {
// 		bot.deleteMessage(chatId, msg.message_id.toString());
// 		try {
// 			const response = await axios.get<IWorkout[]>(`http://localhost:5000/workouts?nToLast=${4}`);
// 			const {data: workoutList} = response;
// 			const currentWorkout = workoutList.at(-1);
// 			if (!currentWorkout) {
// 				return;
// 			}

// 			const currentWorkoutSets = currentWorkout.sets;
// 			const options = new Set(
// 				currentWorkoutSets.map(set => set.exercise),
// 			);
// 			const kbdOptions = generateKeyboardOptions(
// 				[...options],
// 				'startCommand',
// 			);
// 			await bot.sendMessage(chatId, 'Here\'s today\'s workout:', {
// 				reply_markup: {inline_keyboard: kbdOptions},
// 			});
// 		} catch (err: unknown) {
// 			const error = err as Error | AxiosError;
// 			if (!axios.isAxiosError(error)) {
// 				await bot.sendMessage(chatId, error.message);
// 			} else if (!error.response) {
// 				await bot.sendMessage(chatId, 'No server response');
// 			} else if (error.response.status === 404) {
// 				await bot.sendMessage(chatId, 'Invalid URL');
// 			} else if (error.response.status === 400) {
// 				const message = error.response?.data.message;
// 				await bot.sendMessage(chatId, message);
// 			} else {
// 				await bot.sendMessage(chatId, 'Failed to fetch workout list');
// 			}
// 		}
// 	}
// */
// });
