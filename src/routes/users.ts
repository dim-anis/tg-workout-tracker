import {updateUser} from '../controllers/users.js';
import express from 'express';

const router = express.Router();

// Router.get('/:id', getUserById);
router
	.route('/')
	.put(updateUser);

export default router;
