import {InlineKeyboard} from 'grammy';

const isEveryThirdButton = (index: number) => (index + 1) % 3 === 0;
export const rpeValues = [9, 9.5, 10, 7.5, 8, 8.5, 6, 6.5, 7];

const getRpeOptionColor = (value: number): string => {
	if (value >= 9) {
		return '🔴';
	}

	if (value >= 7.5) {
		return '🟠';
	}

	return '🟡';
};

export const getRpeOptions = async (prefix = ''): Promise<InlineKeyboard> => {
	const keyboard = new InlineKeyboard();

	for (const [index, value] of rpeValues.entries()) {
		const color = getRpeOptionColor(value);
		keyboard.text(`${color} ${value}`, `${prefix}:${value}`);

		if (isEveryThirdButton(index)) {
			keyboard.row();
		}
	}

	return keyboard;
};

export const getWeightOptions = async (prevWeight: number, prefix = ''): Promise<InlineKeyboard> => {
	const increments = [1, 2.5, 5, -1, -2.5, -5];
	const keyboard = new InlineKeyboard();

	for (const [index, value] of increments.entries()) {
		const newWeight = prevWeight + value;

		const buttonLabel = value > 0 ? `+ ${value}` : `${value}`;
		const buttonData = `${prefix}:${newWeight}`;
		keyboard.text(buttonLabel, buttonData);

		if (isEveryThirdButton(index)) {
			keyboard.row();
		}
	}

	const defaultButtonLabel = 'Use same';
	const defaultButtonData = `${prefix}:${prevWeight}`;
	keyboard
		.text(defaultButtonLabel, defaultButtonData);

	return keyboard;
};

export const getRepOptions = async (prevReps: number, prefix = ''): Promise<InlineKeyboard> => {
	const increments = [1, 2, 3, -1, -2, -3];
	const keyboard = new InlineKeyboard();

	for (const [index, value] of increments.entries()) {
		const newReps = prevReps + value;

		const buttonLabel = value > 0 ? `+ ${value}` : `${value}`;
		const buttonData = `${prefix}:${newReps}`;
		keyboard.text(buttonLabel, buttonData);

		if (isEveryThirdButton(index)) {
			keyboard.row();
		}
	}

	const defaultButtonLabel = 'Use same';
	const defaultButtonData = `${prefix}:${prevReps}`;
	keyboard
		.text(defaultButtonLabel, defaultButtonData);

	return keyboard;
};

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
