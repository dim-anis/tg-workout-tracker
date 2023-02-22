/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema} from 'mongoose';

export type ExerciseType = {
	name: string;
	category: string;
	is_compound: boolean;
};

const ExerciseSchema = new Schema<ExerciseType>(
	{
		name: {type: String, unique: true},
		category: {type: String},
		is_compound: {type: Boolean, default: false},
	},
);

export default model<ExerciseType>('Exercise', ExerciseSchema);
