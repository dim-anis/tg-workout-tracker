import type {ErrorRequestHandler} from 'express';
import {BaseError} from '../utils/errors.js';

const errorHandler: ErrorRequestHandler = (err: unknown, req, res, next) => {
	// Console.log(err);
};

export default errorHandler;
