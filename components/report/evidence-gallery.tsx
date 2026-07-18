"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import type { InfrastructureReport } from "@/types";

function isRemote(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

export function EvidenceGallery({ report }: { report: InfrastructureReport }) {
  const images = [
    ...(report.imageUrls ?? []),
    ...(report.imageUrl && !(report.imageUrls ?? []).includes(report.imageUrl)
      ? [report.imageUrl]
      : []),
  ].filter(Boolean);

  if (!images.length) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-solid)]/50 px-4 py-6 text-sm text-[var(--muted)]">
        <ImageIcon className="h-5 w-5 shrink-0" />
        No photo evidence uploaded for this ticket.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {images.map((src, index) => (
        <div
          key={`${src.slice(0, 48)}-${index}`}
          className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-100 dark:bg-white/5"
        >
          {isRemote(src) ? (
            <Image
              src={src}
              alt={`Evidence ${index + 1} for ${report.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 360px"
              unoptimized
            />
          ) : (
            // data: URLs — next/image remotePatterns cannot cover these
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={`Evidence ${index + 1} for ${report.title}`}
              className="h-full w-full object-cover"
            />
          )}
          <span className="absolute bottom-2 left-2 rounded-full bg-slate-950/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
            Evidence {index + 1}
          </span>
        </div>
      ))}
    </div>
  );
}
