import {Composer, InlineKeyboard} from 'grammy';
import type {MyContext} from 'bot/types/bot';
import {Menu} from '@grammyjs/menu';

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('main')
	.submenu(
		{text: 'Unit system', payload: 'unit'},
		'settings-unit',
		async ctx =>
			ctx.editMessageText('<b>⚙️ Unit system</b>', {
				parse_mode: 'HTML',
			}),
	)
	.row()
	.text(
		ctx => `Split Length [Curr: ${ctx.dbchat.settings.splitLength} day]`,
		async ctx => {
			await ctx.reply('Please enter the new Split Length:');
		},
	)
	.row()
	.text(
		'✅ Submit',
		async ctx =>
			// Call API and save settings to the DB here or make calls for each setting
			ctx.editMessageText('👌 Settings saved!', {reply_markup: new InlineKeyboard()}),
	);

const settingsUnitMenu = new Menu<MyContext>('settings-unit')
	.text(
		ctx => ctx.session.userSettings.unit === 'kg' ? '● Metric (kg)' : '○ Metric (kg)',
		ctx => {
			ctx.session.userSettings.unit = 'kg';
			ctx.menu.update();
		},
	)
	.text(
		ctx => ctx.session.userSettings.unit === 'lb' ? '● Imperial (lb)' : '○ Imperial (lb)',
		ctx => {
			ctx.session.userSettings.unit = 'lb';
			ctx.menu.update();
		},
	)
	.row()
	.back('✅ Apply');

mainMenu.register(settingsUnitMenu);

composer.use(mainMenu);

composer.command('settings', async ctx => {
	await ctx.reply('⚙️ <b>Settings</b>', {reply_markup: mainMenu, parse_mode: 'HTML'});
});

export default composer;
