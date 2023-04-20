export const addRPEColor = (rpeValue: number) => {
  if (rpeValue >= 9) {
    return '🟥';
  }

  if (rpeValue >= 7.5 && rpeValue < 9) {
    return '🟧';
  }

  if (rpeValue < 7.5) {
    return '🟨';
  }

  return '🟩';
};

export const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export const toHoursAndMins = (totalMinutes: number) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours, minutes };
};
