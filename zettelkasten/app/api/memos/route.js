import { NextResponse } from "next/server";
import { getAllMemos, createRoot } from "../../../lib/db";

export async function GET() {
  return NextResponse.json(getAllMemos());
}

export async function POST(request) {
  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  const memo = createRoot(content.trim());
  return NextResponse.json(memo, { status: 201 });
}
