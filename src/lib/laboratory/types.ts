export type Gender = "MALE" | "FEMALE" | "OTHER";

export type ResultStatus =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "ABNORMAL"
  | "PENDING";

export interface ReferenceRange {
  min?: number;
  max?: number;

  gender?: Gender;
  minAge?: number;
  maxAge?: number;

  display?: string;
}

export interface TestParameter {
  code: string;
  name: string;

  unit: string;

  referenceRanges: ReferenceRange[];

  inputType?: "NUMBER" | "TEXT";

  decimals?: number;

  required?: boolean;

  sortOrder: number;
}

export interface LaboratoryTest {
  code: string;

  name: string;

  category: string;

  description?: string;

  parameters: TestParameter[];

  sortOrder: number;
}