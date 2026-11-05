import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "next/server") return nextResolve("next/server.js", context);
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});
mock.module("next-auth/jwt", { namedExports: { getToken: async () => null } });
mock.module(new URL("./session-cookie.ts", import.meta.url).href, { namedExports: { STUDENT_SESSION_COOKIE: "test-student-session" } });
const { NextRequest } = await import("next/server");
const { proxy } = await import("../proxy.ts");

test("programme catalogue remains accessible before student registration", async () => {
  const response = await proxy(new NextRequest("http://localhost/api/programmes"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("assessment API remains private despite the public programme catalogue", async () => {
  const response = await proxy(new NextRequest("http://localhost/api/assessments"));
  assert.equal(response.status, 401);
});

test("private assessment page redirects to sign-in with its callback", async () => {
  const response = await proxy(new NextRequest("http://localhost/assessments"));
  const location = new URL(response.headers.get("Location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("callbackUrl"), "/assessments");
});
