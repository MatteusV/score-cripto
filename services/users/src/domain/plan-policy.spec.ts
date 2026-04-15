import { describe, expect, it } from "vitest";
import { DefaultPlanPolicy } from "./plan-policy";

describe("DefaultPlanPolicy", () => {
  const policy = new DefaultPlanPolicy();

  it("retorna 5 para FREE_TIER", () => {
    expect(policy.getLimitForPlan("FREE_TIER")).toBe(5);
  });

  it("retorna 15 para PRO", () => {
    expect(policy.getLimitForPlan("PRO")).toBe(15);
  });

  it("usa FREE_TIER como fallback para plano desconhecido", () => {
    expect(policy.getLimitForPlan("UNKNOWN_PLAN")).toBe(5);
  });
});
