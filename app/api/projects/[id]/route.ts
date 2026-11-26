import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeSupabaseUrl } from "@/core/pinger";
import { deleteProject, updateProject } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  try {
    const { id } = await ctx.params;
    const body = (await request.json()) as Record<string, unknown>;

    const patch: {
      name?: string;
      url?: string;
      anonKey?: string;
      enabled?: boolean;
    } = {};

    if (typeof body.name === "string") {
      const trimmed = body.name.trim();
      if (trimmed.length < 1 || trimmed.length > 80) {
        return NextResponse.json(
          { error: "Project name must be between 1 and 80 characters." },
          { status: 400 }
        );
      }
      patch.name = trimmed;
    }

    if (typeof body.url === "string") {
      try {
        patch.url = normalizeSupabaseUrl(body.url);
      } catch {
        return NextResponse.json(
          { error: "Enter a valid Supabase project URL." },
          { status: 400 }
        );
      }
    }

    if (typeof body.anonKey === "string" && body.anonKey.trim().length > 0) {
      if (body.anonKey.trim().length < 20) {
        return NextResponse.json(
          { error: "Enter a valid Supabase anon public key." },
          { status: 400 }
        );
      }
      patch.anonKey = body.anonKey.trim();
    }

    if (typeof body.enabled === "boolean") {
      patch.enabled = body.enabled;
    }

    const updated = updateProject(id, patch);
    if (!updated) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ project: updated });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to update project.",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/projects/[id]">
) {
  try {
    const { id } = await ctx.params;
    const removed = deleteProject(id);
    if (!removed) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to delete project.",
      },
      { status: 500 }
    );
  }
}
