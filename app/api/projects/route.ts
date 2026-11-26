import { NextResponse } from "next/server";
import { connection } from "next/server";
import { createProject, listProjectsWithLogs } from "@/lib/db";
import { validateProjectInput } from "@/lib/utils";

export async function GET() {
  await connection();
  try {
    const projects = listProjectsWithLogs();
    return NextResponse.json({ projects });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to load projects.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const validated = validateProjectInput(body);
    const project = createProject(validated);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Invalid project payload.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
