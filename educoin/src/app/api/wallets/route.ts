import { NextResponse } from "next/server";
import { getChain, saveChain } from "@/lib/blockchain/store";
import type { Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["GOVERNMENT", "INSTITUTION", "STUDENT", "VENDOR"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, role, institution } = body as {
    name?: string;
    role?: Role;
    institution?: string;
  };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "A participant name is required." }, { status: 400 });
  }
  if (!role || !ROLES.includes(role)) {
    return NextResponse.json({ error: "A valid role is required." }, { status: 400 });
  }

  const chain = await getChain();
  const wallet = chain.addWallet(name.trim(), role, institution?.trim() || undefined);
  await saveChain();
  return NextResponse.json({ wallet });
}
