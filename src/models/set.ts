/* eslint-disable @typescript-eslint/naming-convention */
import {model, Schema} from 'mongoose';

export type SetType = {
	weight: number;
	exercise: string;
	repetitions: number;
	rpe: number;
	notes?: string;
};

export const SetSchema = new Schema(
	{
		weight: {type: Number, required: true},
		exercise: {type: String, required: true},
		repetitions: {type: Number, required: true},
		rpe: {type: Number, required: true},
		notes: {type: String, required: false},
	},
	{
		timestamps: true,
	},
);

export default model<SetType>('Set', SetSchema);
