import {Composer} from 'grammy';
import type {MyContext} from '../types/bot';
import {Menu, type MenuFlavor} from '@grammyjs/menu';
import {updateUserSettings} from '../models/user';
import {checkedButton, uncheckedButton} from '../config/keyboards';
import {type UserType} from '../models/user';

const mesocycleLengths = [4, 5, 6];

const composer = new Composer<MyContext>();

const mainMenu = new Menu<MyContext>('main')
	.submenu(
		{text: 'Unit system', payload: 'unit'},
		'settings-unit',
		async ctx =>
			ctx.editMessageText('<b>⚙️ Unit system</b>\n\nChoose one of the two:', {
				parse_mode: 'HTML',
			}),
	)
	.row()
	.submenu(
		{text: 'Split length', payload: 'splitLength'},
		'split-length',
		async ctx => {
			await ctx.editMessageText(
				'<b>⚙️ Split length</b>\n\nChoose the new length:',
				{parse_mode: 'HTML'},
			);
		},
	)
	.row()
	.submenu(
		{text: 'Mesocycle length', payload: 'mesosycleLength'},
		'mesocycle-length',
		async ctx => {
			await ctx.editMessageText(
				'<b>⚙️ Mesocycle length</b>\n\nChoose the new length (in weeks):',
				{parse_mode: 'HTML'},
			);
		},
	)
	.row()
	.text(
		'✅ Submit',
		async ctx => {
			await ctx.editMessageText('👌 Settings saved!', {reply_markup: undefined});
		},
	);

const splitLengthMenu = new Menu<MyContext>('split-length');
for (let length = 1; length < 8; length++) {
	splitLengthMenu.text(
		ctx => ctx.dbchat.settings.splitLength === length ? `${checkedButton} ${length}` : `${uncheckedButton} ${length}`,
		async ctx => updateSettings(ctx, 'splitLength', length),
	);
}

splitLengthMenu
	.row()
	.back('✅ Apply', async ctx => ctx.editMessageText('⚙️ <b>Settings</b>', {parse_mode: 'HTML'}));

const mesocycleLengthMenu = new Menu<MyContext>('mesocycle-length');
for (const lengthOption of mesocycleLengths) {
	mesocycleLengthMenu
		.text(
			ctx => ctx.dbchat.settings.mesocycleLength === lengthOption ? `${checkedButton} ${lengthOption}` : `${uncheckedButton} ${lengthOption}`,
			async ctx => updateSettings(ctx, 'mesocycleLength', lengthOption),
		);
}

mesocycleLengthMenu
	.row()
	.back('✅ Apply', async ctx => ctx.editMessageText('⚙️ <b>Settings</b>', {parse_mode: 'HTML'}));

const settingsUnitMenu = new Menu<MyContext>('settings-unit')
	.text(
		ctx => ctx.dbchat.settings.isMetric ? `${checkedButton} Metric (kg)` : `${uncheckedButton} Metric (kg)`,
		async ctx => updateSettings(ctx, 'isMetric', true),
	)
	.text(
		ctx => ctx.dbchat.settings.isMetric ? `${uncheckedButton} Imperial (lb)` : `${checkedButton} Imperial (lb)`,
		async ctx => updateSettings(ctx, 'isMetric', false),
	)
	.row()
	.back('✅ Apply', async ctx => ctx.editMessageText('⚙️ <b>Settings</b>', {parse_mode: 'HTML'}));

const updateSettings = async <K extends keyof UserType['settings']>(ctx: MyContext & MenuFlavor, settingsKey: K, updatedValue: UserType['settings'][K]) => {
	ctx.dbchat.settings[settingsKey] = updatedValue;
	const {splitLength, mesocycleLength, isMetric} = ctx.dbchat.settings;
	const updatedUser = await updateUserSettings(ctx.dbchat.user_id, splitLength, mesocycleLength, isMetric);
	ctx.menu.update();
};

mainMenu.register(mesocycleLengthMenu);
mainMenu.register(settingsUnitMenu);
mainMenu.register(splitLengthMenu);

composer.use(mainMenu);

composer
	.command('settings', async ctx => {
		await ctx.reply('⚙️ <b>Settings</b>', {reply_markup: mainMenu, parse_mode: 'HTML'});
	});
composer
	.callbackQuery('/settings', async ctx => {
		await ctx.answerCallbackQuery();
		await ctx.reply('⚙️ <b>Settings</b>', {reply_markup: mainMenu, parse_mode: 'HTML'});
	});

export default composer;
