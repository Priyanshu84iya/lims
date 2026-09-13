export type ReportResult = {
  parameterName: string;
  result: string | null;
  unit: string | null;
  referenceMin: string | null;
  referenceMax: string | null;
  referenceDisplay: string | null;
  status: string | null;
};

export type ReportTest = {
  id: number;
  testName: string;
  category: string | null;
  results: ReportResult[];
};

export type ReportRecord = {
  id: number;
  reportNumber: string;
  status: string;
  reportDate: string | null;
  sampleCollectedAt: string | null;
  referredBy: string | null;
  patient: {
    id: number;
    patientCode: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneCountryCode: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  } | null;
  tests: ReportTest[];
};

export type LabInfo = {
  name: string;
  email: string;
  phoneCountryCode: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  registrationNumber: string | null;
  licenseNumber: string | null;
  gstNumber: string | null;
  website: string | null;
  directorName: string | null;
  directorQualification: string | null;
  logoUrl: string | null;
};

export const DEFAULT_LAB: LabInfo = {
  name: "Laboratory",
  email: "",
  phoneCountryCode: null,
  phone: null,
  address: null,
  city: null,
  state: null,
  pincode: null,
  registrationNumber: null,
  licenseNumber: null,
  gstNumber: null,
  website: null,
  directorName: null,
  directorQualification: null,
  logoUrl: null,
};

export function labAddressLine(lab: LabInfo) {
  return [lab.address, lab.city, lab.state, lab.pincode].filter(Boolean).join(", ");
}

export function labContactLine(lab: LabInfo) {
  const phone = lab.phone ? `${lab.phoneCountryCode || ""} ${lab.phone}`.trim() : "";
  return [phone, lab.email].filter(Boolean).join(" · ");
}

export function labSignatory(lab: LabInfo) {
  return lab.directorName ? `${lab.directorName}${lab.directorQualification ? `, ${lab.directorQualification}` : ""}` : "Authorized Signatory";
}

export function referenceText(result: ReportResult) {
  return result.referenceDisplay || (result.referenceMin && result.referenceMax ? `${result.referenceMin} - ${result.referenceMax}` : "-");
}

export function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value)) : "-";
}

export function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "-";
}

export function calculateAge(dateOfBirth: string) {
  if (!dateOfBirth) return "-";
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? `${age} Yrs` : "-";
}

export function patientPhone(patient: ReportRecord["patient"]) {
  if (!patient?.phone) return "-";
  return `${patient.phoneCountryCode || "+91"} ${patient.phone}`;
}

export function groupTests(tests: ReportTest[]) {
  const groups = new Map<string, ReportTest[]>();
  for (const test of tests) {
    const key = test.category || "Pathology";
    const list = groups.get(key) || [];
    list.push(test);
    groups.set(key, list);
  }
  return Array.from(groups.entries());
}

export const AI_DISCLAIMER = "AI-Assisted Health Information — This information is generated from laboratory results for informational purposes only and is not a medical diagnosis.";
