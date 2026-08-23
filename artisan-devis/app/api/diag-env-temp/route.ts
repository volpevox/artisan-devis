import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "(vide)",
    aUneAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    aUneServiceKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
