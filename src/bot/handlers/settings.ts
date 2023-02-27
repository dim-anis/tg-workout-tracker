import {Composer} from 'grammy';
import type {MyContext} from 'bot/types/bot';
import {Menu} from '@grammyjs/menu';
import {updateUser} from '../../bot/api/users';

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('main')
	.submenu(
		{text: 'Unit System', payload: 'unit'},
		'settings-unit',
		async ctx =>
			ctx.editMessageText('<b>⚙️ Unit system</b>\n\nChoose one of the two:', {
				parse_mode: 'HTML',
			}),
	)
	.row()
	.submenu(
		{text: 'Split Length', payload: 'splitLength'},
		'split-length',
		async ctx => {
			await ctx.editMessageText(
				'<b>⚙️ Split Length</b>\n\nPlease choose the new length:',
				{parse_mode: 'HTML'},
			);
		},
	)
	.row()
	.text(
		'✅ Submit',
		async ctx => {
			// Call API and save settings to the DB here or make calls for each setting
			const payload = {
				...ctx.session.userSettings,
				user_id: ctx.dbchat.user_id,
			};
			const r = await updateUser(ctx.dbchat.user_id, JSON.stringify(payload));
			if (r.response === 'successful') {
				await ctx.editMessageText('👌 Settings saved!', {reply_markup: undefined});
			} else {
				await ctx.editMessageText('😔 Failed to update the settings, try again', {reply_markup: undefined});
			}
		},
	);

const splitLengthMenu = new Menu<MyContext>('split-length');
for (let i = 1; i < 8; i++) {
	splitLengthMenu.text(
		ctx => ctx.session.userSettings.splitLength === i ? `● ${i}` : `○ ${i}`,
		ctx => {
			ctx.session.userSettings.splitLength = i;
			ctx.menu.update();
		},
	);
}

splitLengthMenu
	.row()
	.back('✅ Apply', async ctx => ctx.editMessageText('⚙️ <b>Settings</b>', {parse_mode: 'HTML'}));

const settingsUnitMenu = new Menu<MyContext>('settings-unit')
	.text(
		ctx => ctx.session.userSettings.isMetric ? '● Metric (kg)' : '○ Metric (kg)',
		ctx => {
			ctx.session.userSettings.isMetric = true;
			ctx.menu.update();
		},
	)
	.text(
		ctx => ctx.session.userSettings.isMetric ? '○ Imperial (lb)' : '● Imperial (lb)',
		ctx => {
			ctx.session.userSettings.isMetric = false;
			ctx.menu.update();
		},
	)
	.row()
	.back('✅ Apply', async ctx => ctx.editMessageText('⚙️ <b>Settings</b>', {parse_mode: 'HTML'}));

mainMenu.register(settingsUnitMenu);
mainMenu.register(splitLengthMenu);

composer.use(mainMenu);

composer.command('settings', async ctx => {
	await ctx.reply('⚙️ <b>Settings</b>', {reply_markup: mainMenu, parse_mode: 'HTML'});
});

export default composer;
