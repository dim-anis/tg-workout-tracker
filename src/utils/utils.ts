import {InlineKeyboard} from 'grammy';

// Export const generateKeyboard = (array: string[], callbackData?: string) => {
// 	type Button = {
// 		text: string;
// 		callback_data?: string;
// 	};

// 	const result = array.reduce<Button[][]>((acc, curVal) => {
// 		acc.push([{text: curVal, callback_data: callbackData ? `${callbackData}?${curVal}` : curVal}]);
// 		return acc;
// 	}, []);
// 	return result;
// };

export const generateMenu = (menuButtons: string[], opts?: {addBackButton: boolean}) => {
	const menu = new InlineKeyboard();
	if (opts?.addBackButton) {
		menu.text('≪ Back').row();
	}

	for (const buttonText of menuButtons) {
		menu.text(buttonText).row();
	}

	return menu;
};

export const addRPEColor = (rpeValue: number) => {
	if (rpeValue >= 9) {
		return '🟥';
	}

	if (rpeValue >= 7.5 && rpeValue < 9) {
		return '🟧';
	}

	if (rpeValue < 7.5) {
		return '🟨';
	}

	return '🟩';
};

export const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export const getDurationInMin = (start: Date, end: Date) => {
	const msInMinute = 1000 * 60;

	return Math.abs((Number(end) - Number(start)) / msInMinute);
};
