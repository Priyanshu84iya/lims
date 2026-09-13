import ReportView from "@/app/components/report-view";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportView reportId={id} />;
}
