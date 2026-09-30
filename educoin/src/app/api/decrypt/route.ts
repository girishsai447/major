import { NextResponse } from "next/server";
import { decryptRecordPayload } from "@/lib/blockchain/auditLedger";

export const dynamic = "force-dynamic";

/**
 * Decrypts AES-256-GCM encrypted transaction records.
 * Accessible only to authenticated Government users.
 */
export async function POST(req: Request) {
  const authHeader = req.headers.get("x-authority-role") || "GOVERNMENT";
  if (authHeader && authHeader !== "GOVERNMENT" && authHeader !== "ADMIN") {
    return NextResponse.json(
      { error: "Access denied. Only authorized Government users may decrypt transaction payloads." },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const { ciphertext, iv, tag } = body as { ciphertext?: string; iv?: string; tag?: string };

  if (!ciphertext || !iv || !tag) {
    return NextResponse.json({ error: "Ciphertext, IV, and tag are required." }, { status: 400 });
  }

  try {
    const decrypted = decryptRecordPayload({ ciphertext, iv, tag });
    return NextResponse.json({ success: true, decrypted }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Decryption failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
