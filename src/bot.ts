import dotenv from 'dotenv';
import { Bot, session } from 'grammy';
import commands from './config/botCommands.js';
import handlers from './handlers/index.js';
import { type MyContext, type SessionStorage } from 'types/bot.js';
import { conversations } from '@grammyjs/conversations';
import attachUser from './middleware/attachUser.js';
import { errorHandler } from './middleware/errorHandler.js';
import dbConnect from './config/dbConnection.js';
import mongoose from 'mongoose';
import { MongoDBAdapter, type ISession } from '@grammyjs/storage-mongodb';

dotenv.config();

async function runBot() {
  await dbConnect();
  console.log('connected to MongoDB');

  const collection = mongoose.connection.db.collection<ISession>('sessions');

  const bot = new Bot<MyContext>(process.env.KEY!);

  await bot.api.setMyCommands(commands);

  function initial(): SessionStorage {
    return {
      userSettings: {
        isMetric: true,
        splitLength: 4
      },
      state: {
        cmdName: 'idle',
        data: '',
        lastMessageId: 0
      },
      exercises: {
        fromDB: new Set(),
        toAdd: new Set()
      }
    };
  }

  bot.use(
    session({
      initial
      //storage: new MongoDBAdapter<SessionStorage>({collection}),
    })
  );

  // Bot.use(session({
  // 	type: 'multi',
  // 	memorySession: {
  // 		initial: () => ({
  // 			exercises: {
  // 				fromDB: new Set(),
  // 				toAdd: new Set(),
  // 			},
  // 		}),
  // 	},
  // 	storageSession: {
  // 		initial: () => ({
  // 			state: {
  // 				cmdName: '',
  // 				data: '',
  // 				lastMessageId: 0,
  // 			},
  // 		}),
  // 		// ! storage: new MongoStorage.MongoDBAdapter<MongoSessionStorage>({collection}),
  // 	},
  // }));

  bot.use(attachUser);
  bot.use(conversations());
  bot.command('cancel', async (ctx) => {
    await ctx.conversation.exit();
    await ctx.reply('Left the conversation');
  });
  bot.use(handlers);

  bot.on('callback_query:data', async (ctx) => {
    console.log('Unknown button event with payload', ctx.callbackQuery.data);
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
