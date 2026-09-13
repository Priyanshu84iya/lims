import type { LaboratoryTest } from "./types";
import { CBC_TEST } from "./tests/cbc";
import {
  ESR_TEST,
  HEMOGLOBIN_TEST,
  PERIPHERAL_SMEAR_TEST,
  RETICULOCYTE_TEST,
} from "./tests/hematology";
import {
  CALCIUM_TEST,
  ELECTROLYTE_TEST,
  FBS_TEST,
  HBA1C_TEST,
  KFT_TEST,
  LFT_TEST,
  LIPID_PROFILE_TEST,
  PPBS_TEST,
  URIC_ACID_TEST,
} from "./tests/biochemistry";
import {
  FREE_T3_TEST,
  FREE_T4_TEST,
  THYROID_PROFILE_TEST,
  TSH_TEST,
} from "./tests/thyroid";
import {
  ASO_TEST,
  CRP_TEST,
  DENGUE_TEST,
  RA_TEST,
  WIDAL_TEST,
} from "./tests/serology";
import { URINE_ROUTINE_TEST } from "./tests/urine";
import {
  TESTOSTERONE_TEST,
  VITAMIN_B12_TEST,
  VITAMIN_D_TEST,
} from "./tests/hormones";

export const LABORATORY_TESTS: LaboratoryTest[] = [
  CBC_TEST,
  HEMOGLOBIN_TEST,
  ESR_TEST,
  PERIPHERAL_SMEAR_TEST,
  RETICULOCYTE_TEST,
  FBS_TEST,
  PPBS_TEST,
  HBA1C_TEST,
  LIPID_PROFILE_TEST,
  LFT_TEST,
  KFT_TEST,
  ELECTROLYTE_TEST,
  CALCIUM_TEST,
  URIC_ACID_TEST,
  THYROID_PROFILE_TEST,
  TSH_TEST,
  FREE_T3_TEST,
  FREE_T4_TEST,
  CRP_TEST,
  RA_TEST,
  ASO_TEST,
  DENGUE_TEST,
  WIDAL_TEST,
  URINE_ROUTINE_TEST,
  VITAMIN_D_TEST,
  VITAMIN_B12_TEST,
  TESTOSTERONE_TEST,
].sort((left, right) => left.sortOrder - right.sortOrder);

export function getLaboratoryTest(
  code: string
): LaboratoryTest | undefined {
  return LABORATORY_TESTS.find((test) => test.code === code);
}

export function getLaboratoryTestsByCategory(
  category: string
): LaboratoryTest[] {
  return LABORATORY_TESTS.filter(
    (test) => test.category === category
  );
}

export function getLaboratoryCategories(): string[] {
  return Array.from(new Set(LABORATORY_TESTS.map((test) => test.category)));
}