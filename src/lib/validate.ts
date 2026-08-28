import { NextResponse } from "next/server";
import type { ZodType } from "zod";

/**
 * Parses and validates a request's JSON body against a zod schema.
 * Returns `{ data }` on success or `{ response }` with a ready-to-return
 * 400 NextResponse on failure (malformed JSON or failed validation) —
 * callers just do `if ("response" in parsed) return parsed.response;`.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: ZodType<T>
): Promise<{ data: T } | { response: NextResponse }> {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return { response: NextResponse.json({ error: "Corpo della richiesta non è JSON valido" }, { status: 400 }) };
  }

  const result = schema.safeParse(json);
  if (!result.success) {
    return {
      response: NextResponse.json(
        { error: "Validazione fallita", issues: result.error.flatten().fieldErrors },
        { status: 400 }
      ),
    };
  }
  return { data: result.data };
}
