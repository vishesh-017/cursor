"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { siteConfig } from "@/config/site";

const schema = z.object({
  title: z.string().min(4, "Title is required"),
  description: z.string().min(10, "Add more detail"),
  category: z.enum(["roads", "water", "drainage", "lighting", "waste", "other"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  ward: z.string().min(2, "Ward is required"),
  latitude: z.number().min(22).max(24),
  longitude: z.number().min(72).max(73.5),
});

type FormValues = z.infer<typeof schema>;

export function ReportForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      category: "roads",
      priority: "medium",
      ward: "Ellisbridge",
      latitude: siteConfig.mapCenter.lat,
      longitude: siteConfig.mapCenter.lng,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json()) as {
        success: boolean;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.message || payload.error || "Failed to submit");
      }

      setMessage("Report submitted to Urbanexus. AMC ops can triage it from the dashboard.");
      reset({
        ...values,
        title: "",
        description: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Issue title</Label>
        <Input id="title" placeholder="Pothole near SG Highway exit" {...register("title")} />
        {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe location landmarks, severity, and impact on citizens."
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-red-600">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            {...register("category")}
          >
            <option value="roads">Roads</option>
            <option value="water">Water</option>
            <option value="drainage">Drainage</option>
            <option value="lighting">Lighting</option>
            <option value="waste">Waste</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            className="h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            {...register("priority")}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-1">
          <Label htmlFor="ward">Ward</Label>
          <Input id="ward" {...register("ward")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input
            id="latitude"
            type="number"
            step="any"
            {...register("latitude", { valueAsNumber: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input
            id="longitude"
            type="number"
            step="any"
            {...register("longitude", { valueAsNumber: true })}
          />
        </div>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? "Submitting…" : "Submit to AMC"}
      </Button>

      {message && <p className="text-sm text-teal-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
