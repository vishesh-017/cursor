import { ReportForm } from "@/components/report/report-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReportPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Card>
        <CardHeader>
          <CardTitle>Citizen infrastructure report</CardTitle>
          <CardDescription>
            Submit geolocated issues for AMC triage. Reports appear instantly on the
            map and ops dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportForm />
        </CardContent>
      </Card>
    </div>
  );
}
