import { NextResponse } from "next/server";
import { auth } from "../../../auth";
import { getAllMemos, createRoot } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getAllMemos(session.user.id));
}

export async function POST(request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { content } = await request.json();
  if (!content || !content.trim()) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  const memo = await createRoot(session.user.id, content.trim());
  return NextResponse.json(memo, { status: 201 });
}
