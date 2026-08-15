import { describe, expect, it } from "vitest";
import { createCategorySchema } from "~/validators/category.validators";
import { DEFAULT_CATEGORY_COLOR, normalizeCategoryColor } from "./category-color";

describe("normalizeCategoryColor", () => {
  it("accepts 6-digit hex with or without a hash", () => {
    expect(normalizeCategoryColor("#dc2626")).toBe("#dc2626");
    expect(normalizeCategoryColor("dc2626")).toBe("#dc2626");
  });

  it("lowercases hex so color inputs stay valid", () => {
    expect(normalizeCategoryColor("#DC2626")).toBe("#dc2626");
  });

  it("expands 3-digit hex and strips alpha", () => {
    expect(normalizeCategoryColor("#f00")).toBe("#ff0000");
    expect(normalizeCategoryColor("#dc2626ff")).toBe("#dc2626");
  });

  it("returns null for empty or invalid values", () => {
    expect(normalizeCategoryColor("")).toBeNull();
    expect(normalizeCategoryColor("red")).toBeNull();
  });
});

describe("createCategorySchema color", () => {
  const base = { name: "Femenil", description: "Women's division" };

  it("saves common color-picker and typed values", () => {
    expect(createCategorySchema.parse({ ...base, color: "#DC2626" }).color).toBe(
      "#dc2626",
    );
    expect(createCategorySchema.parse({ ...base, color: "374151" }).color).toBe(
      DEFAULT_CATEGORY_COLOR,
    );
  });

  it("rejects values that are not hex colors", () => {
    expect(() => createCategorySchema.parse({ ...base, color: "" })).toThrow();
    expect(() => createCategorySchema.parse({ ...base, color: "blue" })).toThrow();
  });
});
