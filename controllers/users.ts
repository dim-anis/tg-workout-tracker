import User from "../models/user";
import Routine from "../models/routine";

export async function getUserData(name: string) {
  try {
    const data = await User.findOne({"name.last": name}).populate({ path: 'current_routine', select: 'name', model: Routine });
    return data;
  } catch (err) {
      console.log(err);
  }
}

export async function updateLastWorkout(workout: string) {
  try {
    const data = await User.find({
      "name.first": "DMITRII",
      "name.last": "Anisov",
    });
    data[0].last_workout = workout;
    await data[0].save();
  } catch (err) {
      console.log(err);
  }
}
