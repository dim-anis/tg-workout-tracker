import axios from 'axios';
import {type UserType} from 'models/user';

type SuccessfulResponse<UserType extends Record<string, any>> = {
	response: string;
	message?: string;
	data: UserType;
};

type ErrorResponse = {
	message: string;
};

type RequestResponse<UserType extends Record<string, any>> =
  | SuccessfulResponse<UserType>
  | ErrorResponse;

export async function updateUser(userId: string, payload: string) {
	const options = {
		headers: {
			'Content-Type': 'application/json',
		},
	};
	try {
		const response = await axios.put<SuccessfulResponse<UserType>>(`http://localhost:5000/users/${userId}`, payload, options);
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
