import type {Request, Response, NextFunction} from 'express';

const handleAsync = (fn: any) => async (req: Request, res: Response, next: NextFunction) => Promise.resolve(fn(req, res, next)).catch(next);

export default handleAsync;
