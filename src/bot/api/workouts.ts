import axios from 'axios';
import {type WorkoutType} from 'models/workout';

type SuccessfulResponse<WorkoutType extends Record<string, any>> = {
	response: string;
	message?: string;
	data: WorkoutType;
};

type ErrorResponse = {
	message: string;
};

type RequestResponse<WorkoutType extends Record<string, any>> =
  | SuccessfulResponse<WorkoutType>
  | ErrorResponse;

const options = {
	headers: {
		'Content-Type': 'application/json',
	},
};

export async function getWorkouts(limit: number) {
	try {
		const response = await axios.get<SuccessfulResponse<WorkoutType[]>>(`http://localhost:5000/workouts?limit=${limit}`);
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
			message: 'Failed to update the workout. Try again.',
		};
	}
}

export async function updateWorkout(payload: string) {
	try {
		const response = await axios.put<SuccessfulResponse<WorkoutType>>('http://localhost:5000/workouts', payload, options);
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
			message: 'Failed to update the workout. Try again.',
		};
	}
}

export async function upsertSet(payload: string) {
	try {
		const response = await axios.put<SuccessfulResponse<WorkoutType>>('http://localhost:5000/workouts', payload, options);
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
			message: 'Failed to upsert the set. Try again.',
		};
	}
}
