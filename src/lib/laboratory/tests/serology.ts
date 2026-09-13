import type { LaboratoryTest, TestParameter } from "../types";

function text(code: string, name: string, display: string, sortOrder: number): TestParameter {
  return {
    code,
    name,
    unit: "",
    referenceRanges: [{ display }],
    inputType: "TEXT",
    required: true,
    sortOrder,
  };
}

export const CRP_TEST: LaboratoryTest = {
  code: "CRP",
  name: "C-Reactive Protein",
  category: "Serology",
  description: "Quantitative CRP",
  sortOrder: 30,
  parameters: [
    {
      code: "CRP_VALUE",
      name: "CRP",
      unit: "mg/L",
      referenceRanges: [{ min: 0, max: 5 }],
      inputType: "NUMBER",
      decimals: 1,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const RA_TEST: LaboratoryTest = {
  code: "RA",
  name: "RA Factor",
  category: "Serology",
  description: "Rheumatoid factor",
  sortOrder: 31,
  parameters: [
    {
      code: "RA_VALUE",
      name: "Rheumatoid Factor",
      unit: "IU/mL",
      referenceRanges: [{ min: 0, max: 14 }],
      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const ASO_TEST: LaboratoryTest = {
  code: "ASO",
  name: "ASO Titre",
  category: "Serology",
  description: "Anti-streptolysin O titre",
  sortOrder: 32,
  parameters: [
    {
      code: "ASO_VALUE",
      name: "ASO Titre",
      unit: "IU/mL",
      referenceRanges: [{ min: 0, max: 200 }],
      inputType: "NUMBER",
      decimals: 0,
      required: true,
      sortOrder: 1,
    },
  ],
};

export const DENGUE_TEST: LaboratoryTest = {
  code: "DENGUE",
  name: "Dengue NS1 Antigen",
  category: "Serology",
  description: "Dengue NS1 antigen detection",
  sortOrder: 33,
  parameters: [text("DENGUE_NS1", "Dengue NS1 Antigen", "Negative", 1)],
};

export const WIDAL_TEST: LaboratoryTest = {
  code: "WIDAL",
  name: "Widal Test",
  category: "Serology",
  description: "Widal slide agglutination",
  sortOrder: 34,
  parameters: [text("WIDAL_RESULT", "Widal result", "Non-reactive", 1)],
};
