import {InlineKeyboard} from 'grammy';

export const rpeValues = [9, 9.5, 10, 7.5, 8, 8.5, 6, 6.5, 7];

export const getRpeOptions = async (): Promise<InlineKeyboard> => {
	const keyboard = new InlineKeyboard();

	for (const [index, value] of rpeValues.entries()) {
		if (value >= 9) {
			keyboard.text(`🔴 ${value}`, `${value}`);
		} else if (value < 9 && value >= 7.5) {
			keyboard.text(`🟠 ${value}`, `${value}`);
		} else {
			keyboard.text(`🟡 ${value}`, `${value}`);
		}

		if ((index + 1) % 3 === 0) {
			keyboard.row();
		}
	}

	return keyboard;
};

export const getWeightOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('+1', '1')
	.text('+2.5', '2.5')
	.text('+5', '5').row()
	.text('-1')
	.text('-2.5')
	.text('-5').row()
	.text('✏️ Custom', 'customWeightValue')
	.text('Use same', '0');

export const getRepOptions = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('+1', '1')
	.text('+2', '2')
	.text('+3', '3').row()
	.text('-1')
	.text('-2')
	.text('-3').row()
	.text('✏️ Custom', 'customRepValue')
	.text('Use same', '0');

export const getMainMenu = async (): Promise<InlineKeyboard> => new InlineKeyboard()
	.text('Next workout', '/next_workout').row()
	.text('Record set', '/record_set').row()
	.text('Add exercise', '/add_exercise').row()
	.text('Edit exercises', '/edit_exercises').row()
	.text('Settings', '/settings');

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
