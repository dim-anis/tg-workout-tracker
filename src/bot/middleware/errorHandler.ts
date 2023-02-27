import {type ErrorHandler, GrammyError, HttpError} from 'grammy';
import {AxiosError} from 'axios';

export const errorHandler: ErrorHandler = async err => {
	const {ctx} = err;
	console.error(`Error while handling update ${ctx.update.update_id}:`);
	const e = err.error;
	if (e instanceof GrammyError) {
		console.error('Error in request:', e.description);
	} else if (e instanceof HttpError) {
		console.error('Could not contact Telegram:', e);
	} else if (e instanceof AxiosError) {
		console.error('Axios error');
	}	else {
		console.error('Unknown error:', e);
	}
};
