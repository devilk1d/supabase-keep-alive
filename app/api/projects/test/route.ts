import { NextResponse } from "next/server";
import { pingSupabaseTarget } from "@/core/pinger";
import { validateProjectInput } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validateProjectInput({
      name: typeof body.name === "string" && body.name.trim() ? body.name : "Connection Test",
      url: body.url,
      anonKey: body.anonKey,
    });

    const result = await pingSupabaseTarget({
      name: validated.name,
      url: validated.url,
      anonKey: validated.anonKey,
    });

    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Invalid connection test input.",
      },
      { status: 400 }
    );
  }
}
