// End-to-end verification of the Reception -> Test Order -> Results -> Report workflow.
// Requires dev server on :3000. Creates its own lab + patient, so it is safe to re-run.

const BASE = "http://localhost:3000";
const stamp = Date.now();
let passed = 0;
let failed = 0;

function check(name, condition, detail = "") {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function api(path, { method = "GET", cookie, body } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  const setCookie = response.headers.get("set-cookie");
  return { status: response.status, data, cookie: setCookie ? setCookie.split(";")[0] : null };
}

async function main() {
  console.log("1) Admin login + create two labs (A and B for isolation checks)");
  const adminLogin = await api("/api/auth/login", { method: "POST", body: { role: "ADMIN", email: "admin@northstar.local", password: "Admin@12345" } });
  check("admin login", adminLogin.status === 200 && adminLogin.data.success, JSON.stringify(adminLogin.data).slice(0, 200));
  const adminCookie = adminLogin.cookie;

  const labAEmail = `wf-a-${stamp}@test.local`;
  const labBEmail = `wf-b-${stamp}@test.local`;
  const createA = await api("/api/admin/labs", { method: "POST", cookie: adminCookie, body: { name: `Workflow Lab A ${stamp}`, loginEmail: labAEmail, password: "TestPass@123" } });
  const createB = await api("/api/admin/labs", { method: "POST", cookie: adminCookie, body: { name: `Workflow Lab B ${stamp}`, loginEmail: labBEmail, password: "TestPass@123" } });
  check("create lab A", createA.status === 200 && createA.data.success, JSON.stringify(createA.data).slice(0, 200));
  check("create lab B", createB.status === 200 && createB.data.success, JSON.stringify(createB.data).slice(0, 200));

  console.log("2) Lab A login");
  const loginA = await api("/api/auth/login", { method: "POST", body: { role: "LAB", email: labAEmail, password: "TestPass@123" } });
  check("lab A login", loginA.status === 200 && loginA.data.success);
  const cookieA = loginA.cookie;
  const loginB = await api("/api/auth/login", { method: "POST", body: { role: "LAB", email: labBEmail, password: "TestPass@123" } });
  const cookieB = loginB.cookie;
  check("lab B login", loginB.status === 200 && loginB.data.success);

  console.log("3) Register patient in lab A");
  const dob = "1992-05-14";
  const register = await api("/api/patients", { method: "POST", cookie: cookieA, body: { fullName: `Workflow Patient ${stamp}`, dateOfBirth: dob, gender: "FEMALE", phoneCountryCode: "+91", phone: "9876543210", email: `wf-${stamp}@test.local`, address: "12 Test Street", referredBy: "Dr. Workflow" } });
  check("patient registration", register.status === 200 && register.data.success, JSON.stringify(register.data).slice(0, 300));
  const patient = register.data.patient;
  check("patient code sequential (P001)", patient?.patientCode === "P001", `got ${patient?.patientCode}`);

  console.log("4) Create multi-test order (FBS + PPBS)");
  const createOrder = await api("/api/test-orders", { method: "POST", cookie: cookieA, body: { patientId: patient.id, selectedTests: ["FBS", "PPBS"] } });
  check("order creation", createOrder.status === 200 && createOrder.data.success, JSON.stringify(createOrder.data).slice(0, 300));
  const order = createOrder.data.order;
  const orderTests = createOrder.data.tests || [];
  check("order status PENDING", order?.status === "PENDING", `got ${order?.status}`);
  check("order has 2 tests", orderTests.length === 2, `got ${orderTests.length}`);
  check("order linked to patient + lab", order?.patientId === patient.id && order?.labId === createA.data.lab?.id, `patientId=${order?.patientId} labId=${order?.labId}`);

  console.log("5) Validation + isolation checks");
  const badPatient = await api("/api/test-orders", { method: "POST", cookie: cookieA, body: { patientId: 999999, selectedTests: ["FBS"] } });
  check("reject unknown patient", badPatient.status === 404 || badPatient.status === 400, `status ${badPatient.status}`);
  const badTest = await api("/api/test-orders", { method: "POST", cookie: cookieA, body: { patientId: patient.id, selectedTests: ["NOT_A_TEST"] } });
  check("reject unknown test code", badTest.status === 400, `status ${badTest.status}`);
  const noTests = await api("/api/test-orders", { method: "POST", cookie: cookieA, body: { patientId: patient.id, selectedTests: [] } });
  check("reject empty test selection", noTests.status === 400, `status ${noTests.status}`);
  const crossLab = await api(`/api/test-orders/${order.id}`, { cookie: cookieB });
  check("lab B cannot view lab A order", crossLab.status === 404, `status ${crossLab.status}`);
  const unauth = await api("/api/test-orders");
  check("unauthenticated access blocked", unauth.status === 401, `status ${unauth.status}`);

  console.log("6) List + search");
  const listAll = await api("/api/test-orders", { cookie: cookieA });
  check("order appears in list", listAll.data.success && listAll.data.orders.some((o) => o.id === order.id));
  const searchHit = await api(`/api/test-orders?q=${encodeURIComponent("Workflow Patient")}`, { cookie: cookieA });
  check("search by patient name", searchHit.data.orders.some((o) => o.id === order.id));
  const searchOrder = await api(`/api/test-orders?q=${encodeURIComponent(order.orderNumber)}`, { cookie: cookieA });
  check("search by order number", searchOrder.data.orders.some((o) => o.id === order.id));

  console.log("7) Sample collection + partial results");
  const collect = await api(`/api/test-orders/${order.id}`, { method: "PATCH", cookie: cookieA, body: { sampleCollected: true } });
  check("sample collection", collect.status === 200 && collect.data.order?.status === "SAMPLE_COLLECTED" && collect.data.order?.sampleCollectedAt, JSON.stringify(collect.data.order || {}).slice(0, 200));

  const fbsTest = orderTests.find((t) => t.testCode === "FBS");
  const ppbsTest = orderTests.find((t) => t.testCode === "PPBS");

  const draft = await api(`/api/test-orders/${order.id}`, { method: "PATCH", cookie: cookieA, body: { testId: fbsTest.id, results: { FBS_VALUE: "92" } } });
  check("save draft result", draft.status === 200, JSON.stringify(draft.data).slice(0, 300));
  const fbsAfterDraft = draft.data.tests?.find((t) => t.id === fbsTest.id);
  check("all required values entered auto-completes test", fbsAfterDraft?.status === "COMPLETED", `got ${fbsAfterDraft?.status}`);
  check("result row has unit + reference", fbsAfterDraft?.results?.[0]?.unit === "mg/dL" && fbsAfterDraft?.results?.[0]?.referenceMin === "70", JSON.stringify(fbsAfterDraft?.results?.[0] || {}).slice(0, 200));

  console.log("8) Report blocked until all tests complete");
  const earlyReport = await api(`/api/test-orders/${order.id}`, { method: "POST", cookie: cookieA });
  check("report blocked with incomplete tests", earlyReport.status === 409, `status ${earlyReport.status}`);
  const earlyComplete = await api(`/api/test-orders/${order.id}`, { method: "PATCH", cookie: cookieA, body: { status: "COMPLETED" } });
  check("order COMPLETED blocked with incomplete tests", earlyComplete.status === 409, `status ${earlyComplete.status}`);

  const completeFbs = await api(`/api/test-orders/${order.id}`, { method: "PATCH", cookie: cookieA, body: { testId: fbsTest.id, results: { FBS_VALUE: "92" }, testStatus: "COMPLETED" } });
  check("mark FBS completed", completeFbs.status === 200 && completeFbs.data.tests?.find((t) => t.id === fbsTest.id)?.status === "COMPLETED");
  const stillBlocked = await api(`/api/test-orders/${order.id}`, { method: "POST", cookie: cookieA });
  check("report still blocked (PPBS pending)", stillBlocked.status === 409, `status ${stillBlocked.status}`);

  const completePpbs = await api(`/api/test-orders/${order.id}`, { method: "PATCH", cookie: cookieA, body: { testId: ppbsTest.id, results: { PPBS_VALUE: "118" }, testStatus: "COMPLETED" } });
  check("mark PPBS completed", completePpbs.status === 200 && completePpbs.data.tests?.find((t) => t.id === ppbsTest.id)?.status === "COMPLETED");

  console.log("9) Generate report from actual results");
  const generate = await api(`/api/test-orders/${order.id}`, { method: "POST", cookie: cookieA });
  check("report generation", generate.status === 200 && generate.data.success, JSON.stringify(generate.data).slice(0, 300));
  const reportId = generate.data.reportId;
  const orderAfter = await api(`/api/test-orders/${order.id}`, { cookie: cookieA });
  check("order locked as REPORT_GENERATED", orderAfter.data.order?.status === "REPORT_GENERATED" && orderAfter.data.order?.reportId === reportId, JSON.stringify(orderAfter.data.order || {}).slice(0, 200));

  const reportDetail = await api(`/api/reports?id=${reportId}`, { cookie: cookieA });
  check("report exists with 2 tests", reportDetail.status === 200 && (reportDetail.data.report?.tests || []).length === 2, JSON.stringify(reportDetail.data).slice(0, 300));
  const reportTests = reportDetail.data.report?.tests || [];
  const reportFbs = reportTests.find((t) => t.testCode === "FBS");
  check("report copies actual result (92 mg/dL)", reportFbs?.results?.[0]?.result === "92" && reportFbs?.results?.[0]?.unit === "mg/dL", JSON.stringify(reportFbs?.results?.[0] || {}).slice(0, 200));
  const reportPpbs = reportTests.find((t) => t.testCode === "PPBS");
  check("report copies PPBS result (118)", reportPpbs?.results?.[0]?.result === "118");

  const lockedPatch = await api(`/api/test-orders/${order.id}`, { method: "PATCH", cookie: cookieA, body: { testId: fbsTest.id, results: { FBS_VALUE: "999" } } });
  check("locked order rejects edits", lockedPatch.status === 409, `status ${lockedPatch.status}`);
  const regen = await api(`/api/test-orders/${order.id}`, { method: "POST", cookie: cookieA });
  check("duplicate report rejected", regen.status === 409, `status ${regen.status}`);

  console.log("10) Public access via phone + DOB");
  const verify = await api("/api/public/verify-report", { method: "POST", body: { phone: "9876543210", dateOfBirth: dob } });
  check("public verify finds report", verify.status === 200 && verify.data.success && (verify.data.reports || []).some((r) => r.reportNumber === generate.data.reportNumber), JSON.stringify(verify.data).slice(0, 300));
  const token = verify.data.reports?.find((r) => r.reportNumber === generate.data.reportNumber)?.token;
  const download = await fetch(`${BASE}/api/public/download-report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  const pdfBytes = await download.arrayBuffer();
  const pdfHeader = Buffer.from(pdfBytes.slice(0, 5)).toString("latin1");
  check("public download returns PDF", download.status === 200 && pdfHeader === "%PDF-", `status ${download.status} header ${pdfHeader}`);

  const wrongDob = await api("/api/public/verify-report", { method: "POST", body: { phone: "9876543210", dateOfBirth: "1990-01-01" } });
  check("wrong DOB rejected", wrongDob.status === 401, `status ${wrongDob.status}`);

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("Script crashed:", error);
  process.exit(1);
});
