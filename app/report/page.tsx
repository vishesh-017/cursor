import { redirect } from "next/navigation";

export default function LegacyReportPage() {
  redirect("/citizen/reports/new");
}
