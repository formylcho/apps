import { NextResponse } from "next/server";
import { appendChild } from "../../../../../lib/db";

export async function POST(request, { params }) {
  const { id } = await params;
  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  try {
    const memo = appendChild(Number(id), content.trim());
    return NextResponse.json(memo, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 404 });
  }
}
