import { describe, it, expect } from "vitest";
// Tiny unit test to ensure rateLimiter logic works as intended.
import { canSend } from "../src/utils/rateLimiter.js";

describe("rateLimiter", () => {
  it("allows first 5 messages then blocks within 10s window", () => {
    const key = "user:room";
    let allowed = 0, blocked = 0;
    for (let i = 0; i < 7; i++) {
      if (canSend(key)) allowed++; else blocked++;
    }
    expect(allowed).toBe(5);
    expect(blocked).toBe(2);
  });
});
