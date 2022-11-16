import type {ErrorRequestHandler} from 'express';

const errorLogger: ErrorRequestHandler = (err, req, res, next) => {
	// Console.log(err);
};

export default errorLogger;
