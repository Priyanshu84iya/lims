import type { LaboratoryTest, TestParameter } from "../types";

function numeric(
  code: string,
  name: string,
  unit: string,
  min: number,
  max: number,
  sortOrder: number,
  decimals = 1
): TestParameter {
  return {
    code,
    name,
    unit,
    referenceRanges: [{ min, max }],
    inputType: "NUMBER",
    decimals,
    required: true,
    sortOrder,
  };
}

export const FBS_TEST: LaboratoryTest = {
  code: "FBS",
  name: "Fasting Blood Sugar",
  category: "Clinical Biochemistry",
  description: "Fasting plasma glucose",
  sortOrder: 10,
  parameters: [numeric("FBS_VALUE", "Glucose, Fasting", "mg/dL", 70, 99, 1, 0)],
};

export const PPBS_TEST: LaboratoryTest = {
  code: "PPBS",
  name: "Post Prandial Blood Sugar",
  category: "Clinical Biochemistry",
  description: "2-hour post prandial glucose",
  sortOrder: 11,
  parameters: [numeric("PPBS_VALUE", "Glucose, Post Prandial", "mg/dL", 70, 140, 1, 0)],
};

export const HBA1C_TEST: LaboratoryTest = {
  code: "HBA1C",
  name: "Glycated Hemoglobin (HbA1c)",
  category: "Clinical Biochemistry",
  description: "Glycated hemoglobin estimation",
  sortOrder: 12,
  parameters: [numeric("HBA1C_VALUE", "HbA1c", "%", 4.0, 5.6, 1)],
};

export const LIPID_PROFILE_TEST: LaboratoryTest = {
  code: "LIPID",
  name: "Lipid Profile",
  category: "Clinical Biochemistry",
  description: "Fasting lipid profile",
  sortOrder: 13,
  parameters: [
    numeric("CHOL", "Total Cholesterol", "mg/dL", 0, 200, 1, 0),
    numeric("HDL", "HDL Cholesterol", "mg/dL", 40, 60, 2, 0),
    numeric("LDL", "LDL Cholesterol", "mg/dL", 0, 100, 3, 0),
    numeric("VLDL", "VLDL Cholesterol", "mg/dL", 10, 40, 4, 0),
    numeric("TRIG", "Triglycerides", "mg/dL", 0, 150, 5, 0),
  ],
};

export const LFT_TEST: LaboratoryTest = {
  code: "LFT",
  name: "Liver Function Test",
  category: "Clinical Biochemistry",
  description: "Liver function panel",
  sortOrder: 14,
  parameters: [
    numeric("BILI_TOTAL", "Bilirubin, Total", "mg/dL", 0.1, 1.2, 1),
    numeric("BILI_DIRECT", "Bilirubin, Direct", "mg/dL", 0, 0.3, 2),
    numeric("SGOT", "SGOT (AST)", "U/L", 10, 40, 3, 0),
    numeric("SGPT", "SGPT (ALT)", "U/L", 7, 56, 4, 0),
    numeric("ALP", "Alkaline Phosphatase", "U/L", 44, 147, 5, 0),
    numeric("TP", "Total Protein", "g/dL", 6.4, 8.3, 6),
    numeric("ALB", "Albumin", "g/dL", 3.5, 5.0, 7),
  ],
};

export const KFT_TEST: LaboratoryTest = {
  code: "KFT",
  name: "Kidney Function Test",
  category: "Clinical Biochemistry",
  description: "Renal function panel",
  sortOrder: 15,
  parameters: [
    numeric("CREAT", "Creatinine", "mg/dL", 0.6, 1.3, 1),
    numeric("UREA", "Blood Urea", "mg/dL", 17, 43, 2, 0),
    numeric("BUN", "Blood Urea Nitrogen", "mg/dL", 8, 20, 3, 0),
    numeric("URIC", "Uric Acid", "mg/dL", 3.4, 7.0, 4),
  ],
};

export const ELECTROLYTE_TEST: LaboratoryTest = {
  code: "LYTES",
  name: "Electrolyte Panel",
  category: "Clinical Biochemistry",
  description: "Serum electrolytes",
  sortOrder: 16,
  parameters: [
    numeric("NA", "Sodium", "mmol/L", 136, 145, 1, 0),
    numeric("K", "Potassium", "mmol/L", 3.5, 5.1, 2),
    numeric("CL", "Chloride", "mmol/L", 98, 107, 3, 0),
  ],
};

export const CALCIUM_TEST: LaboratoryTest = {
  code: "CA",
  name: "Calcium",
  category: "Clinical Biochemistry",
  description: "Serum calcium",
  sortOrder: 17,
  parameters: [numeric("CA_VALUE", "Calcium, Total", "mg/dL", 8.5, 10.5, 1)],
};

export const URIC_ACID_TEST: LaboratoryTest = {
  code: "URIC",
  name: "Uric Acid",
  category: "Clinical Biochemistry",
  description: "Serum uric acid",
  sortOrder: 18,
  parameters: [numeric("URIC_VALUE", "Uric Acid", "mg/dL", 3.4, 7.0, 1)],
};
