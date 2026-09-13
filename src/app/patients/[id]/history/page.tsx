import ReportView from "@/app/components/report-view";

export default async function PatientHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportView patientId={id} />;
}
