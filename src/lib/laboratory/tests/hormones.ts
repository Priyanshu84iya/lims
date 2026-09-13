import type { LaboratoryTest } from "../types";

export const VITAMIN_D_TEST: LaboratoryTest = {
  code: "VITD",
  name: "Vitamin D (25-OH)",
  category: "Hormones",
  description: "25-hydroxy vitamin D",
  sortOrder: 50,
  parameters: [
    {
      code: "VITD_VALUE",
      name: "Vitamin D, 25-OH",
      unit: "ng/mL",
      referenceRanges: [{ min: 30, max: 100 }],
      inputType: "NUMBER",
      decimals: 1,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const VITAMIN_B12_TEST: LaboratoryTest = {
  code: "VITB12",
  name: "Vitamin B12",
  category: "Hormones",
  description: "Serum vitamin B12",
  sortOrder: 51,
  parameters: [
    {
      code: "VITB12_VALUE",
      name: "Vitamin B12",
      unit: "pg/mL",
      referenceRanges: [{ min: 200, max: 900 }],
      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const TESTOSTERONE_TEST: LaboratoryTest = {
  code: "TESTO",
  name: "Testosterone",
  category: "Hormones",
  description: "Total testosterone",
  sortOrder: 52,
  parameters: [
    {
      code: "TESTO_VALUE",
      name: "Testosterone, Total",
      unit: "ng/dL",
      referenceRanges: [
        { gender: "MALE", min: 300, max: 1000 },
        { gender: "FEMALE", min: 15, max: 70 },
      ],
      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 1,
    },
  ],
};
