
import dotenv from 'dotenv';
import {Bot, GrammyError, HttpError, session} from 'grammy';
import {AxiosError} from 'axios';
import commands from './config/botCommands';
import handlers from './handlers/index';
import type {MyContext} from 'bot/types/bot';
import {conversations} from '@grammyjs/conversations';
import {type SessionStorage} from 'bot/types/bot';
import attachUser from './middleware/attachUser';

dotenv.config();

const bot = new Bot<MyContext>(process.env.KEY!);

await bot.api.setMyCommands(commands);

function initial(): SessionStorage {
	return {userSettings: {
		unit: 'kgs',
		splitLength: 4,
	}};
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

export default bot;
