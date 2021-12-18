import Exercise from '../models/exercise';

export async function showExercises(category: string | '') {
    try {
        if (category) {
            const data = await Exercise.find({ category: category }, 'name').exec();
            return data;
        } else {
            const data = await Exercise.find({});
            return data;
        }
    } catch(e) {
        console.log(e);
    }
}