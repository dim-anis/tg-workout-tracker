import dotenv from 'dotenv';
import mongoose from 'mongoose';
import botAPI from 'node-telegram-bot-api';
import dbConnect from './config/dbConnection';
import type {AxiosError} from 'axios';
import axios from 'axios';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

import commands from './config/botCommands';
import allExercises from './routes/exercises';
import workouts from './routes/workouts';

import type {IExercise} from './models/exercise';
import type {IWorkout} from './models/workouts';

import express from 'express';

const app = express();

app.use(express.json());

app.use('/exercises', allExercises);
app.use('/workouts', workouts);

dotenv.config();

const PORT = process.env.PORT ?? 5000;

import {
	generateKeyboardOptions,
	addRPEColor,
} from './utils/utils';

void dbConnect();

const db = mongoose.connection;
db.once('open', () => {
	console.log('Connected to MongoDB');
	app.listen(PORT, () => {
		console.log(`Server is running on port: ${PORT}.`);
	});
});

const bot = new botAPI(process.env.KEY!, {polling: true});

void bot.setMyCommands(commands);

bot.on('message', async msg => {
	const chatId = msg.chat.id;
	const message = msg.text;

	if (message === '/record_set') {
		try {
			const response = await axios.get<IExercise[]>('http://localhost:5000/exercises');
			const {data: exerciseList} = response;
			const exerciseNames = exerciseList.map(item => item.name);
			const kbdOptions = generateKeyboardOptions(exerciseNames);
			bot.sendMessage(
				chatId,
				'Choose an exercise: ',
				{
					reply_markup: {
						inline_keyboard: kbdOptions,
					},
				});
			bot.deleteMessage(chatId, msg.message_id.toString());

			bot.once('callback_query', async query => {
				bot.answerCallbackQuery(query.id);
				const exercise = query.data;

				await bot.sendMessage(chatId,
					`${exercise}\n\nType in the weight, num of reps and RPE without units separated by " "\n\nExample:\n\n100 10 7.5`,
				);

				bot.once('message', async msg => {
					const stringValues = msg.text?.split(' ');
					if (typeof stringValues === 'undefined' || stringValues.length < 3) {
						throw new Error('Please type all three values separated by space \' \'\n\nE.g.: 100 10 7.5');
					}

					const intValues = stringValues.map(value => parseFloat(value));

					if (intValues.some(value => isNaN(value))) {
						throw new Error('Only numbers are allowed!');
					}

					const [weight, repetitions, rpe] = intValues;
					const currentDate = new Date();
					const set = {
						user: 'Dmitry Anisov',
						createdAt: currentDate,
						sets: [{
							exercise,
						  weight,
						  repetitions,
						  rpe,
						}],
					};
					const response = await axios.put<IWorkout>('http://localhost:5000/workouts', JSON.stringify(set), {
						headers: {
							'Content-Type': 'application/json',
						},
					});
					bot.sendMessage(chatId, `Successfully recorded a set of ${exercise}`);
				});
			});
		} catch (err: unknown) {
			const error = err as Error | AxiosError;
			if (!axios.isAxiosError(error)) {
				// Not an Axios error
				bot.sendMessage(chatId, `An unexpected error occured. Error details: ${error.message}`);
			}

			// Axios error
			if (!error.response) {
				bot.sendMessage(chatId, 'No server response');
			} else if (error.response.status === 404) {
				bot.sendMessage(chatId, 'Invalid URL');
			} else if (error.response.status === 400) {
				const message = error.response?.data.message;
				bot.sendMessage(chatId, message);
			} else {
				bot.sendMessage(chatId, 'Failed to fetch exercise list');
			}
		}
	}

	if (message?.split(' ')[0] === '/show_last_workout') {
		const nToLast = message.split(' ')[1];
		bot.deleteMessage(chatId, msg.message_id.toString());
		try {
			const response = await axios.get<IWorkout[]>(`http://localhost:5000/workouts?nToLast=${nToLast}`);
			const {data: workoutList} = response;
			const lastWorkout = workoutList.at(-1);
			if (!lastWorkout) {
				return;
			}

			const lastWorkoutSets = lastWorkout.sets;
			const timeSinceLastWorkout = formatDistanceToNow(new Date(lastWorkoutSets[0].createdAt));

			const messageString = `Last workout from *${timeSinceLastWorkout} ago:*\n\n`;
			const hintMessage = '* to see nth-last workout type:\n\n/show_last_workout followed by a space and a number\n\nExample: /show_last_workout 2';

			const lastWorkoutMessage = lastWorkoutSets.reduce((acc, set) => {
				const {rpe, exercise, weight, repetitions} = set;
				return acc + `${addRPEColor(rpe)} ${exercise} - ${weight} x ${repetitions}\n`;
			}, messageString);
			console.log(lastWorkoutMessage);
			const kbdOptions = generateKeyboardOptions(['❌'], 'closeLastWorkoutStats');
			await bot.sendMessage(chatId, lastWorkoutMessage, {
				parse_mode: 'Markdown',
				reply_markup: {inline_keyboard: kbdOptions},
			});
			await bot.sendMessage(chatId, hintMessage);
		} catch (err: unknown) {
			const error = err as Error | AxiosError;
			if (!axios.isAxiosError(error)) {
				bot.sendMessage(chatId, `An unexpected error occured. Error details: ${error.message}`);
			} else if (!error.response) {
				bot.sendMessage(chatId, 'No server response');
			} else if (error.response.status === 404) {
				bot.sendMessage(chatId, 'Invalid URL');
			} else if (error.response.status === 400) {
				const message = error.response?.data.message;
				bot.sendMessage(chatId, message);
			} else {
				bot.sendMessage(chatId, 'Failed to fetch workout list');
			}
		}
	}

	if (message === '/start') {
		bot.deleteMessage(chatId, msg.message_id.toString());
		try {
			const response = await axios.get<IWorkout[]>(`http://localhost:5000/workouts?nToLast=${4}`);
			const {data: workoutList} = response;
			const currentWorkout = workoutList.at(-1);
			if (!currentWorkout) {
				return;
			}

			const currentWorkoutSets = currentWorkout.sets;
			const options = new Set(
				currentWorkoutSets.map(set => set.exercise),
			);
			const kbdOptions = generateKeyboardOptions(
				[...options],
				'startCommand',
			);
			await bot.sendMessage(chatId, 'Here\'s today\'s workout:', {
				reply_markup: {inline_keyboard: kbdOptions},
			});
		} catch (err: unknown) {
			const error = err as Error | AxiosError;
			if (!axios.isAxiosError(error)) {
				bot.sendMessage(chatId, error.message);
			} else if (!error.response) {
				bot.sendMessage(chatId, 'No server response');
			} else if (error.response.status === 404) {
				bot.sendMessage(chatId, 'Invalid URL');
			} else if (error.response.status === 400) {
				const message = error.response?.data.message;
				bot.sendMessage(chatId, message);
			} else {
				bot.sendMessage(chatId, 'Failed to fetch workout list');
			}
		}
	}
});
