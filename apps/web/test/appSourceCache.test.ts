import { expect, it, vi } from "vitest";
import {
  buildPayload,
  buildFile,
  embedPayload,
  flushPromises,
  mountApp,
} from "./appTestHelpers";

it.each(["__proto__", "constructor", "toString"])(
  "loads and caches source for file id %s",
  async (id) => {
    const payload = buildPayload();
    payload.report.files = [buildFile(id, "src/special.ts")];
    payload.sources = {};
    embedPayload(payload);
    const fetcher = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id,
        path: "src/special.ts",
        language: "typescript",
        lines: ["source loaded"],
      }),
    }));
    vi.stubGlobal("fetch", fetcher);
    try {
      const wrapper = await mountApp();
      expect(wrapper.find("code").text()).toBe("source loaded");
      const fileButton = wrapper
        .findAll("button")
        .find((button) => button.text().includes("src/special.ts"))!;
      await fileButton.trigger("click");
      await flushPromises();
      expect(fetcher).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);
