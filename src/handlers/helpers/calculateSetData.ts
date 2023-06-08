import { SetType } from 'models/set.js';
import { checkedCircle } from '../../config/keyboards.js';

export function getCompletedSetsString(setCount = 0) {
  return `${[checkedCircle.repeat(setCount)]}`;
}

export function calculateDeloadSetData(set: SetType, deloadPercent = 50) {
  const deloadSet = {
    exercise: set.exercise,
    weight: Math.round(set.weight * (deloadPercent / 100)),
    repetitions: Math.round(set.repetitions * (deloadPercent / 100)),
    rpe: set.rpe
  };

  return deloadSet;
}
