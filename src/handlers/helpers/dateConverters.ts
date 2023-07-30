import { startOfWeek, addDays, addWeeks } from 'date-fns';

export function getWeekDates(year: number, weekNumber: number, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined) {
  // Find the first day of the specified year
  const firstDayOfYear = new Date(year, 0, 1);

  // Find the start date of the specified week based on the weekStartsOn option
  const startOfWeekDate = startOfWeek(firstDayOfYear, { weekStartsOn });

  // Calculate the start date of the correct week by adding (weekNumber - 1) weeks
  const startOfDesiredWeek = addWeeks(startOfWeekDate, weekNumber - 1);

  // Calculate the end date by adding 6 days to the start date
  const endDate = addDays(startOfDesiredWeek, 6);

  return {
    startDate: startOfDesiredWeek,
    endDate,
  };
}
