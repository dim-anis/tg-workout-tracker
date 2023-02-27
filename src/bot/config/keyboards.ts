import {InlineKeyboard} from 'grammy';

export const getRpeOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('🔴 9', '9')
	.text('🔴 9.5', '9.5')
	.text('🔴 10', '10').row()
	.text('🟠 7.5', '7.5')
	.text('🟠 8', '8')
	.text('🟠 8.5', '8.5').row()
	.text('🟡 6', '6')
	.text('🟡 6.5', '6.5')
	.text('🟡 7', '7');

export const getWeightOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('+1')
	.text('+2.5')
	.text('+5').row()
	.text('-1')
	.text('-2.5')
	.text('-5').row()
	.text('✏️ Custom', 'customWeightValue')
	.text('Use same', '0');

export const getRepOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('+1')
	.text('+2')
	.text('+3').row()
	.text('-1')
	.text('-2')
	.text('-3').row()
	.text('✏️ Custom', 'customRepValue')
	.text('Use same', '0');

export const getMainMenu = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('Next workout', '/next_workout').row()
	.text('Record set', '/record_set').row()
	.text('Show last workout', '/show_last_workout').row()
	.text('Delete last set', '/delete_last_set').row()
	.text('Set routine', '/set_routine').row();

export const getEditOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('✏️ Edit', 'editOption')
	.text('✅ Ok', 'okOption');

export const getYesNoOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('No', 'noOption')
	.text('Yes', 'yesOption');

export const getNumberRange = async (number: number): Promise<InlineKeyboard> => {
	const keyboard = new InlineKeyboard();
	for (let i = 0; i < number; i++) {
		keyboard.text(`${i + 1}`);
	}

	return keyboard;
};

export const getMenuFromStringArray = async (labels: string[], options?: {addBackButton: boolean}) => {
	const keyboard = new InlineKeyboard();
	if (options?.addBackButton) {
		keyboard.text('≪ Back').row();
	}

	for (const label of labels) {
		keyboard.text(label).row();
	}

	return keyboard;
};

export const getRecordSetButton = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('Cancel', 'cancel')
	.text('Record a set?', '/record_set');
