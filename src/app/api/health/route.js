import { successResponse } from "@/lib/apiResponse";

export async function GET() {
  return successResponse({ service: "ossr-backend", status: "ok" }, "Health check");
}
