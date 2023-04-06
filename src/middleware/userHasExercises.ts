import {type NextFunction} from 'grammy';
import {type MyContext} from 'types/bot';
import {sendNoExercisesAddedError} from '../handlers/helpers/errors';

export async function userHasExercises(ctx: MyContext, next: NextFunction) {
	if (ctx.dbchat.exercises.length > 0) {
		await next();
		return;
	}

	await ctx.answerCallbackQuery();
	return sendNoExercisesAddedError(ctx);
}
