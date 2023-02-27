/* eslint-disable @typescript-eslint/naming-convention */

import type {Document} from 'mongoose';
import {model, Schema} from 'mongoose';

export type SetType = {
	weight: number;
	exercise: string;
	repetitions: number;
	rpe: number;
	notes?: string;
	createdAt: Date;
	updatedAt: Date;
} & Document;

export const SetSchema = new Schema<SetType>(
	{
		weight: {type: Number, required: true},
		exercise: {type: String, required: true},
		repetitions: {type: Number, required: true},
		rpe: {type: Number, required: true},
		notes: {type: String},
	},
	{
		timestamps: true,
	},
);

const Set = model<SetType>('Set', SetSchema);

export default Set;