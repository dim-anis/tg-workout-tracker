import {Composer, InlineKeyboard, type NextFunction} from 'grammy';
import {getMainMenu} from '../config/keyboards';
import type {MyContext} from 'bot/types/bot';
import {handleSignUp} from './signUpHandler';
import {createConversation} from '@grammyjs/conversations';

const composer = new Composer<MyContext>();

const handleStart = async (ctx: MyContext, next: NextFunction) => {
	// Const mustHaveFields = ['user_id'];
	// const finisedRegistration = mustHaveFields.every(field => Object.keys(ctx.dbchat).includes(field));
	// if (finisedRegistration) {
	// 	await ctx.reply('Choose an option:', {reply_markup: await getMainMenu()});
	// } else if (ctx.from?.first_name) {
	// 	await ctx.conversation.enter('handleSignUp');
	// }
	await ctx.reply('Choose an option:', {reply_markup: await getMainMenu()});
};

composer.use(createConversation(handleSignUp));

composer.command('start', handleStart);

export default composer;
