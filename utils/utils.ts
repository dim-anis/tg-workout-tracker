import { IRoutine } from "../models/routine";
import { ISet } from "../models/set";

// helper functions
export function getTodaysWorkout(lastWorkout: string, exerciseOrder: Array<string>) {
  let todaysWorkout: string;
  if (exerciseOrder.indexOf(lastWorkout) + 1 == exerciseOrder.length) {
    todaysWorkout = exerciseOrder[0];
  } else {
    todaysWorkout = exerciseOrder[exerciseOrder.indexOf(lastWorkout) + 1];
  }
  return todaysWorkout;
}

export function getLastWorkoutsDate(splitDays: number, setsArray: Array<ISet>) {
  let workoutDates = new Set<string>();
  for (let i = 0; i <= setsArray.length; i++) {
    if (workoutDates.size <= splitDays) {
      workoutDates.add(setsArray[i].createdAt.toISOString().split("T")[0]);
    }
  }
  return [...workoutDates][splitDays];
}

export function getWorkoutSequence(routine: IRoutine) {
  let workoutSequence: Array<string> = [];
  for (let i = 0; i < routine.workouts.length; i++) {
    workoutSequence.push(routine.workouts[i].name);
  }
  return workoutSequence;
}

export function generateKeyboardOptions(array: any, callback_data?: string) {
  let keyboard_options: Array<any> = [];
  const avgLength = array.join('').length / array.length;
  if (avgLength <= 5) {
    keyboard_options = [[]];
    for (let i = 0; i < array.length; i++) {
      keyboard_options[0].push(
        { text: array[i], callback_data: callback_data ? `${callback_data}/${array[i]}` : array[i]},
      )
    }
  } else {
      for (let i = 0; i < array.length; i++) {
        keyboard_options.push([
          { text: array[i], callback_data: callback_data ? `${callback_data}/${array[i]}` : array[i]},
        ]);
      }
  }
  return keyboard_options;
}

export const sortSetsByDate = function(arr: ISet[]) {
  const newObject: Record<string, any> = {};

  for (let i = 0; i < arr.length; i++) {

    const dateString = arr[i].createdAt.toISOString().split("T")[0];

    if (!newObject.hasOwnProperty(dateString)) {
      newObject[dateString] = {
        date: dateString,
        sets: [
          { weight: arr[i].weight, repetitions: arr[i].repetitions },
        ],
      };

    } else {
      newObject[dateString].sets.push({
        weight: arr[i].weight,
        repetitions: arr[i].repetitions,
      });
    }
  }
  interface SortedArrayItem {
    date: string,
    sets: Array<{weight: number, repetitions: number}>
  }
  const sortedArray: SortedArrayItem[] = Object.values(newObject);
  return sortedArray;
};

export const addRPEColor = (rpeValue: number) => {
  if (rpeValue >= 9) {
    return "🟥";
  } else if (rpeValue >= 7.5 && rpeValue < 9) {
    return "🟧";
  } else if (rpeValue < 7.5) {
    return "🟨";
  } else {
    return "🟩";
  }
};

