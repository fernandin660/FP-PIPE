import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const next = searchParams.get("next");
  const destino =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) {
    return NextResponse.redirect(origin);
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(url, chave, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesParaDefinir) {
          try {
            cookiesParaDefinir.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    });

    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(`${origin}${destino}`);
}
