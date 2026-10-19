import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  const isStudentEmail = user?.email?.endsWith("@students.manchilui.com") ?? false;

  if (path === "/portal" && !user) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }
  if (path === "/portal/login" && user && isStudentEmail) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }
  if (path.startsWith("/admin") && path !== "/admin/login" && !user) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  if (path === "/admin/login" && user && !isStudentEmail) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  return response;
}

export const config = { matcher: ["/portal/:path*", "/admin/:path*"] };
