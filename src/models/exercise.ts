/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema} from 'mongoose';

export type ExerciseType = {
	name: string;
	category: string;
	is_compound: boolean;
};

export const ExerciseSchema = new Schema(
	{
		name: {type: String, required: true},
		category: {type: String, required: true},
		is_compound: {type: Boolean, required: true},
	},
);

export default model<ExerciseType>('Exercise', ExerciseSchema);

