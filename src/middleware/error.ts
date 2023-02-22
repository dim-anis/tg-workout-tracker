import {type NextFunction, type Request, type Response} from 'express';
import {type MongoError} from 'mongodb';
import {Error as MongooseError} from 'mongoose';
import {ErrorResponse} from 'utils/errors';

type ErrorWithStatus = {
	status?: number;
} & Error;

export const errorHandler = (err: ErrorWithStatus, req: Request, res: Response, next: NextFunction) => {
	let error = {...err};

	error.message = err.message;

	if (err.name === 'CastError') {
		const message = 'Resource not found';
		error = new ErrorResponse(404, message);
	}

	// Mongoose duplicate key
	if (err.name === 'MongoError' && (err as MongoError).code === 11000) {
		const message = 'Duplicate field value entered';
		error = new ErrorResponse(400, message);
	}

	// Mongoose validation error
	if (err instanceof MongooseError.ValidationError) {
		const message = Object.values(err.errors).map(val => val.message).join(', ');
		error = new ErrorResponse(400, message);
	}

	res.status(error.status ?? 500).json({
		message: error.message || 'Server Error',
	});

	// Log to console for dev
	console.log(err);
};
