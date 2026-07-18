import Link from "next/link";
import { ResearchPanel } from "@/components/intel/research-panel";
import { Button } from "@/components/ui/button";

export default function IntelPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Exa infrastructure intel
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Ask Exa for Ahmedabad-focused research briefs with citations — drainage,
            mobility, utilities, and ward-level readiness.
          </p>
        </div>
        <Link href="/ai">
          <Button variant="outline">Open full AI Lab</Button>
        </Link>
      </div>
      <ResearchPanel />
    </div>
  );
}
