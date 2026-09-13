import type { LaboratoryTest } from "../types";

export const HEMOGLOBIN_TEST: LaboratoryTest = {
  code: "HB",
  name: "Hemoglobin",
  category: "Hematology",
  description: "Hemoglobin estimation",
  sortOrder: 2,
  parameters: [
    {
      code: "HB_VALUE",
      name: "Hemoglobin",
      unit: "g/dL",
      referenceRanges: [
        { gender: "MALE", min: 13, max: 17 },
        { gender: "FEMALE", min: 12, max: 15.5 },
      ],
      inputType: "NUMBER",
      decimals: 1,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const ESR_TEST: LaboratoryTest = {
  code: "ESR",
  name: "Erythrocyte Sedimentation Rate",
  category: "Hematology",
  description: "ESR by Westergren method",
  sortOrder: 3,
  parameters: [
    {
      code: "ESR_VALUE",
      name: "ESR",
      unit: "mm/hr",
      referenceRanges: [
        { gender: "MALE", min: 0, max: 15 },
        { gender: "FEMALE", min: 0, max: 20 },
      ],
      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const RETICULOCYTE_TEST: LaboratoryTest = {
  code: "RETIC",
  name: "Reticulocyte Count",
  category: "Hematology",
  description: "Reticulocyte percentage count",
  sortOrder: 4,
  parameters: [
    {
      code: "RETIC_VALUE",
      name: "Reticulocyte Count",
      unit: "%",
      referenceRanges: [{ min: 0.5, max: 2.5 }],
      inputType: "NUMBER",
      decimals: 1,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const PERIPHERAL_SMEAR_TEST: LaboratoryTest = {
  code: "PS",
  name: "Peripheral Smear",
  category: "Hematology",
  description: "Peripheral blood smear examination",
  sortOrder: 5,
  parameters: [
    {
      code: "PS_RESULT",
      name: "Smear finding",
      unit: "",
      referenceRanges: [{ display: "Normocytic normochromic" }],
      inputType: "TEXT",
      required: true,
      sortOrder: 1,
    },
  ],
};
