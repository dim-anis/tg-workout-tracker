import {findOrCreateUser} from '../models/user';
import {type NextFunction} from 'grammy';
import {type MyContext} from '../types/bot';

const attachUser = async (ctx: MyContext, next: NextFunction) => {
	if (!ctx.chat?.id) {
		return;
	}

	const user = await findOrCreateUser(ctx.chat.id);

	ctx.dbchat = user.toObject();
	await next();
};

export default attachUser;
