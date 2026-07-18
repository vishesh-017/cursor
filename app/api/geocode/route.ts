import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().min(2).max(120),
});

type NominatimItem = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  importance?: number;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({ q: searchParams.get("q") ?? "" });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Search query must be at least 2 characters", 422);
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("countrycodes", "in");
    url.searchParams.set("q", `${parsed.data.q}, Ahmedabad, Gujarat`);
    // Ahmedabad bounding box (left, top, right, bottom)
    url.searchParams.set("viewbox", "72.40,23.20,72.75,22.90");
    url.searchParams.set("bounded", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Urbanexus-AMC/1.0 (hackathon; contact@urbanexus.local)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return fail("GEOCODE_FAILED", "Location search is temporarily unavailable", 502);
    }

    const raw = (await response.json()) as NominatimItem[];
    const results = raw.map((item) => ({
      id: String(item.place_id),
      label: item.display_name,
      latitude: Number(item.lat),
      longitude: Number(item.lon),
      type: item.type ?? "place",
    }));

    return ok({ results }, "Locations found");
  } catch (error) {
    return fromError(error);
  }
}
