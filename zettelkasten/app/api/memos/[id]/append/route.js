import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { appendChild } from "../../../../../lib/db";

export async function POST(request, { params }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  try {
    const memo = await appendChild(session.user.id, Number(id), content.trim());
    return NextResponse.json(memo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
