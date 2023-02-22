import User from '../../models/user';
import {type NextFunction} from 'grammy';
import {type MyContext} from 'bot/types/bot';

const attachUser = async (ctx: MyContext, next: NextFunction) => {
	if (!ctx.chat?.id) {
		return;
	}

	let user = await User.findOne({user_id: ctx.chat.id});
	if (!user) {
		user = new User({
			user_id: ctx.chat.id,
		});
		await user.save();
	}

	ctx.dbchat = user.toObject();
	return next();
};

export default attachUser;
