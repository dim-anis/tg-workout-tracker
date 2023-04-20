import {Composer} from 'grammy';
import {getMainMenu} from '../config/keyboards.js';
import type {MyContext} from '../types/bot.js';

const composer = new Composer<MyContext>();

const handleStart = async (ctx: MyContext) => {
	await ctx.reply('Choose an option:', {reply_markup: await getMainMenu()});
};

composer.command(['start', 'menu'], handleStart);
composer.callbackQuery(['/start', '/menu'], handleStart);

export default composer;
