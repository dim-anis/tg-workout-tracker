import User from '../models/user';

export async function getUserData() {
    try {
        const data = await User.find({});
        return data;
    } catch (err) {
        console.log(err);
    }
}

export async function updateLastWorkout(workout: string) {
    try {
        const data = await User.find({ 'name.first': 'DMITRII', 'name.last': 'Anisov' });
        data[0].last_workout = workout;
        await data[0].save();
    } catch (err) {
        console.log(err)
    }
}

