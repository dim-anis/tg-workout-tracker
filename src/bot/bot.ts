
import dotenv from 'dotenv';
import {Bot, session} from 'grammy';
import commands from './config/botCommands';
import handlers from './handlers/index';
import type {MyContext} from 'bot/types/bot';
import {conversations} from '@grammyjs/conversations';
import {type SessionStorage} from 'bot/types/bot';
import attachUser from './middleware/attachUser';
import {errorHandler} from './middleware/errorHandler';

dotenv.config();

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

bot.use(session({initial}));

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

export default bot;
