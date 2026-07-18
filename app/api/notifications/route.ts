import { fail, fromError, ok } from "@/lib/api/response";
import { getSession } from "@/lib/auth/session";
import { getNotifications, markNotificationRead } from "@/services/store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHENTICATED", "Sign in required", 401);
    return ok({ notifications: getNotifications(session.id) }, "Notifications");
  } catch (error) {
    return fromError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session) return fail("UNAUTHENTICATED", "Sign in required", 401);
    const body = (await request.json()) as { id?: string };
    if (!body.id) return fail("VALIDATION_ERROR", "Notification id required", 422);
    const item = markNotificationRead(body.id, session.id);
    if (!item) return fail("NOT_FOUND", "Notification not found", 404);
    return ok({ notification: item }, "Marked as read");
  } catch (error) {
    return fromError(error);
  }
}
