import { describe, expect, it } from "vitest";
import {
  normalizeRule,
  policyHasRules,
  ruleHasRights,
} from "../../src/data/user";

describe("normalizeRule", () => {
  it("expands a full-access rule to every right", () => {
    expect(normalizeRule(true)).toEqual({
      read: true,
      control: true,
      edit: true,
      configure: true,
    });
  });

  it("keeps a partial rule as written", () => {
    expect(normalizeRule({ read: true })).toEqual({ read: true });
  });

  it("normalizes a missing rule to no rights", () => {
    expect(normalizeRule(undefined)).toEqual({});
  });
});

describe("ruleHasRights", () => {
  it("reports rights when any right is set", () => {
    expect(ruleHasRights({ configure: true })).toBe(true);
  });

  it("reports no rights for an empty rule", () => {
    expect(ruleHasRights({})).toBe(false);
  });
});

describe("policyHasRules", () => {
  it("reports no rules for an empty policy", () => {
    expect(policyHasRules({})).toBe(false);
    expect(policyHasRules(null)).toBe(false);
    expect(policyHasRules({ entities: {} })).toBe(false);
  });

  it("reports rules for device, area, and domain entries", () => {
    expect(
      policyHasRules({
        entities: { device_ids: { "device-1": { read: true } } },
      })
    ).toBe(true);
    expect(
      policyHasRules({
        entities: { area_ids: { "area-1": { control: true } } },
      })
    ).toBe(true);
    expect(
      policyHasRules({
        entities: { domains: { light: { configure: true } } },
      })
    ).toBe(true);
  });

  it("ignores entries without rights", () => {
    expect(
      policyHasRules({
        entities: { device_ids: { "device-1": {} } },
      })
    ).toBe(false);
  });
});
