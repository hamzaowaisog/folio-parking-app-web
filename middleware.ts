import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth/session";

export function middleware(request: NextRequest) {
  if (request.cookies.get(ACCESS_TOKEN_COOKIE)?.value) return NextResponse.next();

  const signIn = request.nextUrl.clone();
  signIn.pathname = "/sign-in";
  signIn.search = "";
  signIn.searchParams.set("status", "sign-in");
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/my-space/:path*",
    "/free-spaces/:path*",
    "/profile/:path*",
    "/gate/:path*",
    "/admin/:path*",
  ],
};
