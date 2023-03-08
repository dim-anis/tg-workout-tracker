import {Composer} from 'grammy';
import {getMainMenu} from '../config/keyboards';
import type {MyContext} from '../types/bot';

const composer = new Composer<MyContext>();

const handleStart = async (ctx: MyContext) => {
	await ctx.reply('Choose an option:', {reply_markup: await getMainMenu()});
};

composer.command('start', handleStart);

export default composer;
