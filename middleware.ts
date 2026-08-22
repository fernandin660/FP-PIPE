import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !chave) return NextResponse.next();

  let resposta = NextResponse.next({ request });

  const supabase = createServerClient(url, chave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesParaDefinir) {
        cookiesParaDefinir.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        resposta = NextResponse.next({ request });
        cookiesParaDefinir.forEach(({ name, value, options }) =>
          resposta.cookies.set(name, value, options)
        );
      },
    },
  });

  await supabase.auth.getUser();

  return resposta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
