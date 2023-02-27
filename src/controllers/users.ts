import type {NextFunction, Request, Response} from 'express';
import User from '../models/user';
import handleAsync from '../middleware/async';
import {ErrorResponse} from '../utils/errors';

export const updateUser = handleAsync(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
	const splitLength: number = parseInt(req.body.splitLength as string, 10);
	const isMetric = req.body.isMetric as boolean;

	const userUpdated = await User.findOneAndUpdate(
		{user_id: req.params.id},
		{
			$set: {
				settings: {
					splitLength,
					isMetric,
				},
			},
		},
		{
			new: true,
		},
	);

	if (!userUpdated) {
		next(new ErrorResponse(400, `User with ID "${req.params.id}" doesn't exist`));
	}

	res.status(200).send({
		response: 'successfull',
		message: '',
		data: userUpdated,
	});
});

