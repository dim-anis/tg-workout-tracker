import Routine from '../models/routine';

export async function displayRoutine() {
    try {
        const workout = await Routine.find({ 'name': 'Upper/Lower'}).populate('workouts.exercise_sequence', 'name');
        return workout[0];
    } catch (err) {
        console.log(err);
    }
};