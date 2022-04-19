import Set, { ISet } from "../models/set";
import endOfDay from "date-fns/endOfDay";
import startOfDay from "date-fns/startOfDay";
import subDays from "date-fns/subDays";

export async function addSet(
  exercise: string,
  weight: number,
  repetitions: number,
  rpe: number
) {
  try {
    const set_data: ISet = new Set({
      exercise: exercise,
      weight: weight,
      repetitions: repetitions,
      rpe: rpe,
    });

    await set_data.save();
    return "✅ Data has been successfully recorded";
  } catch (err) {
    return (err as Error).message;
  }
}

export async function getLastWorkoutSets() {
  try {
    const lastDateISO = await Set.findOne().sort({ createdAt: -1 });
    const lastDate = lastDateISO?.createdAt.toISOString().split("T")[0];
    if (lastDate !== undefined) {
      const lastWorkout = await Set.find({
        "createdAt": {
          $gte: startOfDay(new Date(lastDate)),
          $lte: endOfDay(new Date(lastDate)),
        },
      });
      return lastWorkout;
    }
  } catch (err) {
    console.log(err);
  }
}

export async function getLastNumberOfSets(numberOfSets: number) {
  try {
    const lastWorkouts = await Set.find().sort({ "createdAt": -1 }).limit(numberOfSets);
    return lastWorkouts;
  } catch (err) {
      console.log(err);
  }
}

export async function getAllSetsFrom(date: string) {
  try {
    const sets = await Set.find({
      "createdAt": {
        $gte: startOfDay(new Date(date)),
        $lte: endOfDay(new Date(date))
    }});
    return sets;
  } catch (err) {
      console.log(err);
  }
}

export async function deleteLastSet() {
  try {
    const lastSet = await Set.findOne().sort({ "createdAt": -1 });
    if (lastSet) {
      return await Set.deleteOne({ _id: lastSet._id });
    }
  } catch (err) {
      console.log(err);
  }
}

export async function getAllSetsOf(exercise: string) {
  try {
    const allSets: Array<ISet> = await Set.find({
      "exercise": exercise,
      "createdAt": {
        $gte: startOfDay(subDays(new Date(Date.now()), 30)),
        $lte: endOfDay(subDays(new Date(Date.now()), 1))
      },
    });
      return allSets;
  } catch (err) {
      console.log(err);
  }
}
