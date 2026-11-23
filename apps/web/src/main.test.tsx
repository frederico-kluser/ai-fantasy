import { act, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("site entry point", () => {
  it("given the page has a #root element when the entry module runs then the start page appears in it", async () => {
    const root = document.createElement("div");
    root.id = "root";
    document.body.append(root);

    await act(async () => {
      await import("./main.tsx");
    });

    expect(within(root).getByRole("heading", { level: 1 }).textContent).toBe("AI Fantasy");
  });
});
