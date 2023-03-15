import dotenv from 'dotenv';
import {Bot, session} from 'grammy';
import commands from './config/botCommands';
import handlers from './handlers/index';
import {type MyContext, type SessionStorage} from 'types/bot';
import {conversations} from '@grammyjs/conversations';
import attachUser from './middleware/attachUser';
import {errorHandler} from './middleware/errorHandler';
import dbConnect from './config/dbConnect';
import mongoose from 'mongoose';
import type * as MongoStorage from '@grammyjs/storage-mongodb';

dotenv.config();

async function runBot() {
	await dbConnect();
	console.log('connected to MongoDB');

	const collection = mongoose.connection.db.collection<MongoStorage.ISession>(
		'sessions',
	);

	const bot = new Bot<MyContext>(process.env.KEY!);

	await bot.api.setMyCommands(commands);

	function initial(): SessionStorage {
		return {
			userSettings: {
				isMetric: true,
				splitLength: 4,
			},
			sets: [],
		};
	}

	bot.use(session({
		initial,
		// Storage: new MongoStorage.MongoDBAdapter<SessionStorage>({collection}),
	}));

	bot.use(attachUser);
	bot.use(conversations());
	bot.use(handlers);

	bot.command('cancel', async ctx => {
		await ctx.conversation.exit();
		await ctx.reply('Left the conversation');
	});

	bot.on('callback_query:data', async ctx => {
		console.log('Unknown button event with payload', ctx.callbackQuery.data);
		await ctx.answerCallbackQuery();
	});

	bot.catch(errorHandler);

	await bot.start({
		drop_pending_updates: true,
		allowed_updates: ['message', 'callback_query'],
		onStart() {
			console.log('bot is up and running');
		},
	});

	process.once('SIGTERM', async () => bot.stop());
	process.once('SIGINT', async () => bot.stop());
}

void runBot();
