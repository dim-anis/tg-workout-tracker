import Set, { ISet }  from '../models/set';
import endOfDay from 'date-fns/endOfDay';
import startOfDay from 'date-fns/startOfDay';

export async function addSet(exercise: string, weight: number, repetitions: number, rpe: number ) {
    try {
        const set_data: ISet = new Set(
            {
                exercise: exercise,
                weight: weight,
                repetitions: repetitions,
                rpe: rpe
            }
        );
        let data = await set_data.save();
        console.log(data);
        return 'Data has been successfully recorded.'
    } catch (err) {
        return (err as Error).message;
    }

}

export async function getLastWorkout() {
    try {
        const lastDateISO = await Set.find({});
        const lastDate = lastDateISO?.at(-1)?.createdAt.toISOString().split('T')[0];
        console.log(lastDate);
        if (lastDate !== undefined){
            const lastWorkout = await Set.find({
                createdAt: {
                    $gte: startOfDay(new Date(lastDate)),
                    $lte: endOfDay(new Date(lastDate))
                }
            });
            return lastWorkout;
        }
    } catch (err) {
        console.log(err);
    }
}