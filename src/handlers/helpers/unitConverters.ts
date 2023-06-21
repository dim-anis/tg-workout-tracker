const oneKgInLb = 2.20462;

// rounding lb to the nearest integer
export function fromKgToLbRounded(valueInKg: number) {
  return Math.round(valueInKg * oneKgInLb);
}

// rounding kg to 2 decimal points
export function fromLbToKgRounded(valueInLb: number) {
  return Number((valueInLb / oneKgInLb).toFixed(2));
}
