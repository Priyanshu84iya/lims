"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  FileText,
  FlaskConical,
  Plus,
  Users,
} from "lucide-react";
import AppShell from "@/app/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LABORATORY_TESTS } from "@/lib/laboratory/registry";

type Report = {
  id: number;
  reportNumber: string;
  status: string;
  reportDate: string | null;
  createdAt: string;
  patient?: { fullName: string; patientCode: string } | null;
  tests?: { testName: string }[];
};

type Patient = { id: number };

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
    : "Not dated";
}

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then((response) => response.json()),
      fetch("/api/patients").then((response) => response.json()),
    ])
      .then(([reportsData, patientsData]) => {
        setReports(reportsData.reports || []);
        setPatients(patientsData.patients || []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const recentReports = useMemo(
    () =>
      [...reports]
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        )
        .slice(0, 6),
    [reports]
  );

  const stats = [
    { label: "Total reports", value: reports.length, icon: FileText },
    { label: "Registered patients", value: patients.length, icon: Users },
    { label: "Tests in catalog", value: LABORATORY_TESTS.length, icon: FlaskConical },
    {
      label: "Completed reports",
      value: reports.filter((report) => report.status !== "DRAFT").length,
      icon: Activity,
    },
  ];

  return (
    <AppShell title="Dashboard">
      <main className="px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-sm text-slate-500">Clinical workspace</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h2>
              <p className="mt-2 text-sm text-slate-500">
                Laboratory activity at a glance.
              </p>
            </div>
            <Button asChild>
              <Link href="/reports/new">
                <Plus /> New report
              </Link>
            </Button>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    {loading ? (
                      <Skeleton className="mt-2 h-8 w-16" />
                    ) : (
                      <p className="mt-1 text-3xl font-semibold tracking-tight">
                        {stat.value}
                      </p>
                    )}
                  </div>
                  <span className="flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                    <stat.icon size={20} />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Recent reports</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/reports">
                  View all <ArrowRight />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <Skeleton key={item} className="h-14 w-full" />
                  ))}
                </div>
              ) : recentReports.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No reports yet. Create your first pathology report.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentReports.map((report) => (
                    <Link
                      key={report.id}
                      href={`/reports/${report.id}`}
                      className="flex items-center justify-between gap-4 py-3.5 transition hover:bg-slate-50"
                    >
                      <div>
                        <p className="font-semibold text-teal-800">{report.reportNumber}</p>
                        <p className="mt-0.5 text-sm text-slate-500">
                          {report.patient?.fullName || "Unknown patient"} ·{" "}
                          {report.tests?.map((test) => test.testName).join(", ") || "No tests"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="hidden text-sm text-slate-400 sm:block">
                          {formatDate(report.reportDate || report.createdAt)}
                        </span>
                        <Badge variant={report.status === "DRAFT" ? "secondary" : "success"}>
                          {report.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </AppShell>
  );
}
