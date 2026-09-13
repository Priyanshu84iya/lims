import type { LaboratoryTest } from "../types";

export const THYROID_PROFILE_TEST: LaboratoryTest = {
  code: "THYROID",
  name: "Thyroid Profile",
  category: "Thyroid Profile",
  description: "T3, T4 and TSH panel",
  sortOrder: 20,
  parameters: [
    {
      code: "T3",
      name: "Triiodothyronine (T3)",
      unit: "ng/dL",
      referenceRanges: [{ min: 80, max: 200 }],
      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 1,
    },
    {
      code: "T4",
      name: "Thyroxine (T4)",
      unit: "mcg/dL",
      referenceRanges: [{ min: 5, max: 12 }],
      inputType: "NUMBER",
      decimals: 1,
      required: true,
      sortOrder: 2,
    },
    {
      code: "TSH",
      name: "Thyroid Stimulating Hormone",
      unit: "mIU/L",
      referenceRanges: [{ min: 0.4, max: 4.0 }],
      inputType: "NUMBER",
      decimals: 2,
      required: true,
      sortOrder: 3,
    },
  ],
};

export const TSH_TEST: LaboratoryTest = {
  code: "TSH",
  name: "TSH",
  category: "Thyroid Profile",
  description: "Thyroid stimulating hormone",
  sortOrder: 21,
  parameters: [
    {
      code: "TSH_VALUE",
      name: "TSH",
      unit: "mIU/L",
      referenceRanges: [{ min: 0.4, max: 4.0 }],
      inputType: "NUMBER",
      decimals: 2,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const FREE_T3_TEST: LaboratoryTest = {
  code: "FT3",
  name: "Free T3",
  category: "Thyroid Profile",
  description: "Free triiodothyronine",
  sortOrder: 22,
  parameters: [
    {
      code: "FT3_VALUE",
      name: "Free T3",
      unit: "pg/mL",
      referenceRanges: [{ min: 2.3, max: 4.2 }],
      inputType: "NUMBER",
      decimals: 2,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const FREE_T4_TEST: LaboratoryTest = {
  code: "FT4",
  name: "Free T4",
  category: "Thyroid Profile",
  description: "Free thyroxine",
  sortOrder: 23,
  parameters: [
    {
      code: "FT4_VALUE",
      name: "Free T4",
      unit: "ng/dL",
      referenceRanges: [{ min: 0.8, max: 1.8 }],
      inputType: "NUMBER",
      decimals: 2,
      required: true,
      sortOrder: 1,
    },
  ],
};
