import { IRoutine } from "../models/routine";

// helper functions
export function getTodaysWorkout(lastWorkout: string, order: Array<string>) {
  let todaysWorkout: string;
  if (order.indexOf(lastWorkout) + 1 == order.length) {
    todaysWorkout = order[0];
  } else {
    todaysWorkout = order[order.indexOf(lastWorkout) + 1];
  }
  return todaysWorkout;
}

export function getWorkoutSequence(routine: IRoutine) {
  let workoutSequence: Array<string> = [];
  for (let i = 0; i < routine.workouts.length; i++) {
    workoutSequence.push(routine.workouts[i].name);
  }
  return workoutSequence;
}

export function generateKeyboardOptions(array: any) {
  let keyboard_options = [];
  for (let i = 0; i < array.length; i++) {
    keyboard_options.push([
      { text: array[i].name, callback_data: array[i].name },
    ]);
  }
  return keyboard_options;
}
