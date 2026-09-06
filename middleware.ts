import { NextRequest, NextResponse } from "next/server";
import { validCredentials } from "./lib/auth-credentials";

export async function middleware(request: NextRequest) {
  const username = process.env.ACCESS_AUTH_USERNAME;
  const password = process.env.ACCESS_AUTH_PASSWORD;
  if (!username || !password || password.length < 32) {
    return new NextResponse("Access protection is not configured.", {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
  if (!await validCredentials(request.headers.get("authorization"), username, password)) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Access analytics", charset="UTF-8"',
        "Cache-Control": "no-store",
      },
    });
  }
  const response = NextResponse.next();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
