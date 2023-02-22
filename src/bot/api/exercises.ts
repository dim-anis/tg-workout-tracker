import axios from 'axios';
import type {ExerciseType} from '../../models/exercise';

type SuccessfulResponse<ExerciseType extends Record<string, any>> = {
	response: string;
	message?: string;
	data: ExerciseType[];
};

type ErrorResponse = {
	message: string;
};

type RequestResponse<ExerciseType extends Record<string, any>> =
  | SuccessfulResponse<ExerciseType>
  | ErrorResponse;

export async function getAllExercises() {
	try {
		const response = await axios.get<SuccessfulResponse<ExerciseType>>('http://localhost:5000/exercises');
		if (response.statusText !== 'OK') {
			throw new Error(response.statusText);
		}

		const {data} = response.data;
		return {
			response: 'successful',
			message: '',
			data,
		};
	} catch (e) {
		return {
			message: 'Failed to update the user. Try again.',
		};
	}
}

export async function createExercise(payload: string) {
	const options = {
		headers: {
			'Content-Type': 'application/json',
		},
	};
	try {
		const response = await axios.put<SuccessfulResponse<ExerciseType>>('http://localhost:5000/exercises', payload, options);

		if (response.statusText !== 'OK') {
			throw new Error(response.statusText);
		}

		const {data} = response.data;
		return {
			response: 'successful',
			message: '',
			data,
		};
	} catch (e) {
		return {
			message: 'Failed to create the exercise. Try again.',
		};
	}
}
