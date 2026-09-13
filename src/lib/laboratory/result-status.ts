import type {
  Gender,
  ReferenceRange,
  ResultStatus,
  TestParameter,
} from "./types";

interface RangeContext {
  gender?: Gender;
  age?: number;
}

export function getReferenceRange(
  parameter: TestParameter,
  context: RangeContext
): ReferenceRange | undefined {
  const { gender, age } = context;

  // First try to find the most specific matching range.
  const matchingRange = parameter.referenceRanges.find((range) => {
    // Gender check
    if (range.gender && range.gender !== gender) {
      return false;
    }

    // Minimum age check
    if (
      age !== undefined &&
      range.minAge !== undefined &&
      age < range.minAge
    ) {
      return false;
    }

    // Maximum age check
    if (
      age !== undefined &&
      range.maxAge !== undefined &&
      age > range.maxAge
    ) {
      return false;
    }

    return true;
  });

  return matchingRange;
}

export function getResultStatus(
  result: string | number | undefined,
  parameter: TestParameter,
  context: RangeContext
): ResultStatus {
  if (
    result === undefined ||
    result === null ||
    result === ""
  ) {
    return "PENDING";
  }

  const numericResult =
    typeof result === "number"
      ? result
      : Number(result);

  // If the result is not numeric, mark it as abnormal for now.
  if (Number.isNaN(numericResult)) {
    return "ABNORMAL";
  }

  const range = getReferenceRange(parameter, context);

  // If no usable numeric range exists.
  if (
    !range ||
    range.min === undefined ||
    range.max === undefined
  ) {
    return "ABNORMAL";
  }

  if (numericResult < range.min) {
    return "LOW";
  }

  if (numericResult > range.max) {
    return "HIGH";
  }

  return "NORMAL";
}