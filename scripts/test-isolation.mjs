const BASE = "http://localhost:3000";

function extractCookie(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const match = setCookie.match(/lims_session=([^;]+)/);
  return match ? `lims_session=${match[1]}` : null;
}

async function api(path, { method = "GET", cookie, body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await response.json(); } catch { /* ignore */ }
  return { status: response.status, data, cookie: extractCookie(response) };
}

const results = [];
function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}  ${detail || ""}`);
}

async function main() {
  // --- Setup: admin login, create two labs ---
  const adminLogin = await api("/api/auth/login", { method: "POST", body: { role: "ADMIN", email: "admin@northstar.local", password: "Admin@12345" } });
  check("admin login", adminLogin.status === 200 && adminLogin.data?.success, `status=${adminLogin.status}`);
  const adminCookie = adminLogin.cookie;

  const stamp = Date.now();
  const labAEmail = `lab-a-${stamp}@test.local`;
  const labBEmail = `lab-b-${stamp}@test.local`;

  const createA = await api("/api/admin/labs", { method: "POST", cookie: adminCookie, body: { name: `Isolation Lab A ${stamp}`, loginEmail: labAEmail, password: "TestPass@123" } });
  const createB = await api("/api/admin/labs", { method: "POST", cookie: adminCookie, body: { name: `Isolation Lab B ${stamp}`, loginEmail: labBEmail, password: "TestPass@123" } });
  check("create Lab A", createA.status === 200 && createA.data?.success, `id=${createA.data?.lab?.id}`);
  check("create Lab B", createB.status === 200 && createB.data?.success, `id=${createB.data?.lab?.id}`);

  // --- Login as each lab ---
  const loginA = await api("/api/auth/login", { method: "POST", body: { role: "LAB", email: labAEmail, password: "TestPass@123" } });
  const loginB = await api("/api/auth/login", { method: "POST", body: { role: "LAB", email: labBEmail, password: "TestPass@123" } });
  check("login Lab A", loginA.status === 200, `status=${loginA.status}`);
  check("login Lab B", loginB.status === 200, `status=${loginB.status}`);
  const cookieA = loginA.cookie;
  const cookieB = loginB.cookie;

  // --- Lab A creates patient + report ---
  const patientA = await api("/api/patients", { method: "POST", cookie: cookieA, body: { fullName: "Alice Isolation", dateOfBirth: "1990-05-10", gender: "FEMALE", phoneCountryCode: "+91", phone: "9876543210", email: "alice@test.local" } });
  check("Lab A creates patient", patientA.status === 200 && patientA.data?.success, `id=${patientA.data?.patient?.id} code=${patientA.data?.patient?.patientCode}`);
  const patientAId = patientA.data?.patient?.id;

  const reportA = await api("/api/reports", { method: "POST", cookie: cookieA, body: { patientId: patientAId, selectedTests: ["CBC"], results: {} } });
  check("Lab A creates report", reportA.status === 200 && reportA.data?.success, `reportId=${reportA.data?.reportId} number=${reportA.data?.reportNumber}`);
  const reportAId = reportA.data?.reportId;

  // --- Lab B creates its own patient ---
  const patientB = await api("/api/patients", { method: "POST", cookie: cookieB, body: { fullName: "Bob Isolation", dateOfBirth: "1985-03-03", gender: "MALE", phoneCountryCode: "+91", phone: "9876543211", email: "bob@test.local" } });
  check("Lab B creates patient", patientB.status === 200 && patientB.data?.success, `id=${patientB.data?.patient?.id}`);

  // --- Cross-lab access attempts (Lab B -> Lab A data) ---
  let r = await api("/api/patients", { cookie: cookieB });
  const bSeesA = (r.data?.patients || []).some((p) => p.id === patientAId);
  check("Lab B patient list excludes Lab A patients", r.status === 200 && !bSeesA, `patients=${(r.data?.patients || []).length}, containsA=${bSeesA}`);

  r = await api(`/api/patients?q=Alice`, { cookie: cookieB });
  check("Lab B search for Lab A patient returns nothing", r.status === 200 && (r.data?.patients || []).length === 0, `count=${(r.data?.patients || []).length}`);

  r = await api(`/api/patients/${patientAId}`, { cookie: cookieB });
  check("Lab B direct GET Lab A patient -> 404", r.status === 404, `status=${r.status}`);

  r = await api(`/api/reports?id=${reportAId}`, { cookie: cookieB });
  check("Lab B direct GET Lab A report -> 404", r.status === 404, `status=${r.status}`);

  r = await api("/api/reports", { cookie: cookieB });
  const bReportsHasA = (r.data?.reports || []).some((rep) => rep.id === reportAId);
  check("Lab B report list excludes Lab A reports", r.status === 200 && !bReportsHasA, `reports=${(r.data?.reports || []).length}, containsA=${bReportsHasA}`);

  r = await api("/api/ai-analysis", { method: "POST", cookie: cookieB, body: { reportId: reportAId } });
  check("Lab B AI analysis on Lab A report -> 404", r.status === 404, `status=${r.status}`);

  r = await api("/api/reports", { method: "POST", cookie: cookieB, body: { patientId: patientAId, selectedTests: ["CBC"], results: {} } });
  check("Lab B cannot create report for Lab A patient -> 404", r.status === 404, `status=${r.status}`);

  // --- Reverse direction (Lab A -> Lab B data) ---
  const patientBId = patientB.data?.patient?.id;
  r = await api(`/api/patients/${patientBId}`, { cookie: cookieA });
  check("Lab A direct GET Lab B patient -> 404", r.status === 404, `status=${r.status}`);

  r = await api("/api/patients", { cookie: cookieA });
  const aSeesB = (r.data?.patients || []).some((p) => p.id === patientBId);
  check("Lab A patient list excludes Lab B patients", r.status === 200 && !aSeesB, `containsB=${aSeesB}`);

  // --- No-auth access ---
  r = await api("/api/patients");
  check("unauthenticated /api/patients -> 401", r.status === 401, `status=${r.status}`);
  r = await api(`/api/patients/${patientAId}`);
  check("unauthenticated patient GET -> 401", r.status === 401, `status=${r.status}`);
  r = await api(`/api/reports?id=${reportAId}`);
  check("unauthenticated report GET -> 401", r.status === 401, `status=${r.status}`);
  r = await api("/api/test-db");
  check("removed /api/test-db -> 404", r.status === 404, `status=${r.status}`);

  // --- Regression: Lab A still sees its own data ---
  r = await api(`/api/patients/${patientAId}`, { cookie: cookieA });
  check("Lab A can still read own patient", r.status === 200 && r.data?.patient?.fullName === "Alice Isolation", `status=${r.status}`);
  r = await api(`/api/reports?id=${reportAId}`, { cookie: cookieA });
  check("Lab A can still read own report", r.status === 200 && r.data?.report?.id === reportAId, `status=${r.status}`);
  r = await api("/api/tests", { cookie: cookieA });
  check("Lab A can load test registry", r.status === 200 && Array.isArray(r.data?.tests), `status=${r.status}`);
  r = await api("/api/lab", { cookie: cookieA });
  check("Lab A can load own lab profile", r.status === 200 && r.data?.lab?.id === createA.data?.lab?.id, `status=${r.status}`);

  const failed = results.filter((x) => !x.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
