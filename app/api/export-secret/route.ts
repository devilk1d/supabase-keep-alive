import { NextResponse } from "next/server";
import { connection } from "next/server";
import { getDecryptedActiveTargets } from "@/lib/db";

export async function GET() {
  await connection();
  try {
    const activeTargets = getDecryptedActiveTargets();
    const exported = activeTargets.map((target) => ({
      name: target.name,
      url: target.url,
      anonKey: target.anonKey,
    }));

    return NextResponse.json({
      count: exported.length,
      json: JSON.stringify(exported, null, 2),
      targets: exported,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to export GitHub secret payload.",
      },
      { status: 500 }
    );
  }
}
