/* eslint-disable @typescript-eslint/naming-convention */

import {model, Schema, type Types} from 'mongoose';

export type ExerciseType = {
	_id: Types.ObjectId;
	name: string;
	category: string;
	is_compound: boolean;
};

export const ExerciseSchema = new Schema(
	{
		name: {type: String, required: true, unique: true},
		category: {type: String, required: true},
		is_compound: {type: Boolean, default: false},
	},
);

export default model<ExerciseType>('Exercise', ExerciseSchema);

