import { z } from "zod";
import { fail, fromError, ok } from "@/lib/api/response";

export const runtime = "nodejs";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

type NominatimReverse = {
  place_id?: number;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city_district?: string;
    city?: string;
    town?: string;
    state?: string;
  };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
    });
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Valid lat/lng required", 422);
    }

    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("format", "json");
    url.searchParams.set("lat", String(parsed.data.lat));
    url.searchParams.set("lon", String(parsed.data.lng));
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Urbanexus-AMC/1.0 (hackathon; contact@urbanexus.local)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return fail("GEOCODE_FAILED", "Reverse geocode unavailable", 502);
    }

    const raw = (await response.json()) as NominatimReverse;
    if (!raw.display_name) {
      return fail("NOT_FOUND", "No address found for that point", 404);
    }

    const road =
      raw.address?.road ||
      raw.address?.neighbourhood ||
      raw.address?.suburb ||
      raw.display_name.split(",")[0] ||
      "Pinned location";

    return ok(
      {
        label: raw.display_name,
        road,
        latitude: Number(raw.lat ?? parsed.data.lat),
        longitude: Number(raw.lon ?? parsed.data.lng),
        suburb: raw.address?.suburb ?? raw.address?.city_district ?? null,
      },
      "Address resolved"
    );
  } catch (error) {
    return fromError(error);
  }
}
