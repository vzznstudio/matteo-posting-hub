import { NextResponse } from "next/server";
import { syncAccounts } from "@/lib/accounts";
import { postforme } from "@/lib/postforme";

// POST = refresh from both providers. POST ?connect=tiktok = OAuth link for a new TikTok account.
export async function POST(req: Request) {
  const connect = new URL(req.url).searchParams.get("connect");
  if (connect) {
    if (connect !== "tiktok") return NextResponse.json({ error: "Only TikTok connects from here" }, { status: 400 });
    try {
      const { url } = await postforme.authUrl("tiktok");
      return NextResponse.json({ url });
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 502 });
    }
  }
  return NextResponse.json(await syncAccounts());
}
