const oneKgInLb = 2.20462;

// rounding lb to the nearest integer
export function pounds(valueInKg: number) {
  return Math.round(valueInKg * oneKgInLb);
}

// rounding kg to 2 decimal points
export function kgs(valueInLb: number) {
  return Number((valueInLb / oneKgInLb).toFixed(2));
}

export function roundToNearestHalf(number: number) {
  return Math.round(number * 2) / 2;
}
