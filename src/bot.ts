import dotenv from 'dotenv';
import dbConnect from './config/dbConnection.js';
//import mongoose from 'mongoose';
//const { connection } = mongoose;
//import { MongoDBAdapter, type ISession } from '@grammyjs/storage-mongodb';
import { Bot, session } from 'grammy';
import { type MyContext } from 'types/bot.js';
import commands from './config/botCommands.js';
import { type SessionStorage, initial } from './config/sessionStorage.js';
import attachUser from './middleware/attachUser.js';
import { conversations } from '@grammyjs/conversations';
import handlers from './handlers/index.js';
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

async function runBot() {
  await dbConnect();
  console.log('connected to MongoDB');

  //const collection = connection.db.collection<ISession>('sessions');

  const bot = new Bot<MyContext>(process.env.KEY!);

  await bot.api.setMyCommands(commands);

  bot.use(
    session({
      initial
      //storage: new MongoDBAdapter<SessionStorage>({ collection })
    })
  );
  bot.use(attachUser);
  bot.use(conversations());

  bot.command('cancel', async (ctx) => {
    await ctx.conversation.exit();
    await ctx.reply('Left the conversation');
  });

  bot.use(handlers);

  bot.on('callback_query:data', async (ctx) => {
    console.log('Unknown button event with payload:', ctx.callbackQuery.data);
    await ctx.answerCallbackQuery();
  });

  bot.catch(errorHandler);

  await bot.start({
    drop_pending_updates: true,
    allowed_updates: ['message', 'callback_query'],
    onStart() {
      console.log('bot is up and running');
    }
  });

  process.once('SIGTERM', async () => bot.stop());
  process.once('SIGINT', async () => bot.stop());
}

void runBot();
