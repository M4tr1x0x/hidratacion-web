import { NextResponse } from "next/server";

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;

  // --- COOKIES NECESARIAS ---
  const sessionToken = request.cookies.get("sessionToken");

  // === AUTH: LOGIN Y REGISTRO ===
  if (pathname.startsWith("/iniciar-sesion") || pathname.startsWith("/crear-cuenta")) {
    if (sessionToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // === PROTEGER /dashboard ===
  if (pathname.startsWith("/dashboard")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/iniciar-sesion", request.url));
    }
    return NextResponse.next();
  }

  // === PROTEGER /admin ===
  // (por ahora solo exige cookie, después agregamos verificación de rol)
  if (pathname.startsWith("/admin")) {
    if (!sessionToken) {
      return NextResponse.redirect(new URL("/iniciar-sesion", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

// === Rutas donde aplica el middleware ===
export const config = {
  matcher: [
    "/iniciar-sesion",
    "/crear-cuenta",
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};
