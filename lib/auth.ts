import "server-only";
import { headers } from "next/headers";
import { validCredentials } from "./auth-credentials";

export async function requireAccess() {
  const requestHeaders = await headers();
  if (!await validCredentials(requestHeaders.get("authorization"), process.env.ACCESS_AUTH_USERNAME, process.env.ACCESS_AUTH_PASSWORD)) {
    throw new Error("Authentication required");
  }
}
