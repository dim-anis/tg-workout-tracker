import type {Request, Response} from 'express';
import User from '../models/user';
import handleAsync from '../middleware/async';
import {ErrorResponse} from '../utils/errors';

export const updateUser = handleAsync(async (req: Request, res: Response): Promise<void> => {
	const splitLength: number = parseInt(req.body.splitLength as string, 10);
	const unit = req.body.unit as string;
	const user_id: string = req.body.user_id as string;

	const userUpdated = await User.findOneAndUpdate(
		{user_id},
		{
			$set: {
				settings: {
					splitLength,
					unit,
				},
			},
		},
		{
			new: true,
		},
	);

	if (!userUpdated) {
		throw new ErrorResponse(400, `User with ID "${user_id}" doesn't exist`);
	}

	res.status(200).send({
		response: 'successfull',
		message: '',
		data: userUpdated,
	});
});

