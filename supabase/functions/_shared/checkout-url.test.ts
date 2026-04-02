import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCheckoutSessionUrl,
  CHECKOUT_VERSION_V1,
  CHECKOUT_VERSION_V2,
  normalizeCheckoutVersion,
} from "./checkout-url.ts";

Deno.test("normalizeCheckoutVersion defaults to v1", () => {
  assertEquals(normalizeCheckoutVersion(null), CHECKOUT_VERSION_V1);
  assertEquals(normalizeCheckoutVersion(undefined), CHECKOUT_VERSION_V1);
  assertEquals(normalizeCheckoutVersion("invalid"), CHECKOUT_VERSION_V1);
  assertEquals(normalizeCheckoutVersion("checkout_v2"), CHECKOUT_VERSION_V2);
});

Deno.test("buildCheckoutSessionUrl v1 preserves legacy query shape", () => {
  assertEquals(
    buildCheckoutSessionUrl("https://checkout.example.com", "abc-uuid", CHECKOUT_VERSION_V1),
    "https://checkout.example.com?session=abc-uuid",
  );
});

Deno.test("buildCheckoutSessionUrl v2 uses contrato-flow-v3.html on host", () => {
  assertEquals(
    buildCheckoutSessionUrl("https://checkout.example.com/", "abc-uuid", CHECKOUT_VERSION_V2),
    "https://checkout.example.com/contrato-flow-v3.html?session=abc-uuid",
  );
});

Deno.test("buildCheckoutSessionUrl v2 strips existing path on host", () => {
  assertEquals(
    buildCheckoutSessionUrl("https://checkout.example.com/legacy/index.html", "x", CHECKOUT_VERSION_V2),
    "https://checkout.example.com/contrato-flow-v3.html?session=x",
  );
});
