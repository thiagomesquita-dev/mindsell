import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/assert_equals.ts";
import { assertExists } from "https://deno.land/std@0.224.0/assert/assert_exists.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/criar-supervisor`;

Deno.test("rejects request without authorization header", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      nome: "Test",
      email: "test@test.com",
      senha: "123456",
      carteiras: ["QUALICORP"],
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 400);
  assertExists(body.error);
});

Deno.test("rejects request with empty payload", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({}),
  });

  const body = await response.json();
  // Should fail either with auth error or validation error
  assertEquals(response.status, 400);
  assertExists(body.error);
});

Deno.test("rejects payload with missing carteiras", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      nome: "Supervisor Test",
      email: "sup@test.com",
      senha: "123456",
      carteiras: [],
    }),
  });

  const body = await response.json();
  assertEquals(response.status, 400);
  assertExists(body.error);
});

Deno.test("handles CORS preflight", async () => {
  const response = await fetch(FUNCTION_URL, {
    method: "OPTIONS",
    headers: {
      apikey: SUPABASE_ANON_KEY,
    },
  });

  await response.text();
  assertEquals(response.status, 200);
  assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
});
