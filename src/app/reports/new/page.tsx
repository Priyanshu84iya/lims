import ReportWorkspace from "@/app/components/report-workspace";
import AppShell from "@/app/components/app-shell";

export default function NewReportPage() {
  return (
    <AppShell title="Create pathology report">
      <ReportWorkspace />
    </AppShell>
  );
}
