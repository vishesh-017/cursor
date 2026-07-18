import { ResearchPanel } from "@/components/intel/research-panel";

export default function IntelPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Exa infrastructure intel
        </h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Ask Exa for Ahmedabad-focused research briefs with citations — drainage,
          mobility, utilities, and ward-level readiness.
        </p>
      </div>
      <ResearchPanel />
    </div>
  );
}
