import type { LaboratoryTest } from "../types";

export const CBC_TEST: LaboratoryTest = {
  code: "CBC",
  name: "Complete Blood Count",
  category: "Hematology",
  description: "Complete Blood Count examination",

  sortOrder: 1,

  parameters: [
    {
      code: "HB",
      name: "Haemoglobin",
      unit: "g/L",

      referenceRanges: [
        {
          gender: "MALE",
          min: 135,
          max: 175,
        },
        {
          gender: "FEMALE",
          min: 120,
          max: 155,
        },
      ],

      inputType: "NUMBER",
      decimals: 1,
      required: true,
      sortOrder: 1,
    },

    {
      code: "RBC",
      name: "Erythrocyte Count",
      unit: "×10¹²/L",

      referenceRanges: [
        {
          gender: "MALE",
          min: 4.5,
          max: 5.9,
        },
        {
          gender: "FEMALE",
          min: 4.1,
          max: 5.1,
        },
      ],

      inputType: "NUMBER",
      decimals: 2,
      required: true,
      sortOrder: 2,
    },

    {
      code: "WBC",
      name: "Leukocyte Count",
      unit: "×10⁹/L",

      referenceRanges: [
        {
          min: 4,
          max: 11,
        },
      ],

      inputType: "NUMBER",
      decimals: 2,
      required: true,
      sortOrder: 3,
    },

    {
      code: "PLT",
      name: "Platelet Count",
      unit: "×10⁹/L",

      referenceRanges: [
        {
          min: 150,
          max: 450,
        },
      ],

      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 4,
    },

    {
      code: "MCV",
      name: "Mean Corpuscular Volume",
      unit: "fL",

      referenceRanges: [
        {
          min: 80,
          max: 100,
        },
      ],

      inputType: "NUMBER",
      decimals: 1,
      required: false,
      sortOrder: 5,
    },
  ],
};