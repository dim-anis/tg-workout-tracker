import Routine from "../models/routine";

export async function displayRoutine(name: string) {
  try {
    const workout = await Routine.find({"name": name}).populate(
      "workouts.exercise_sequence",
      "name"
    );
    return workout[0];
  } catch (err) {
      console.log(err);
  }
}
