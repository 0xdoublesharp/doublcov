import { afterEach, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import App from "../src/App.vue";

let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
});

it("renders real comment tokens after paging into the middle of a block comment", async () => {
  const lines = [
    "/*",
    ...Array.from({ length: 998 }, () => "const x = 1;"),
    "*/",
  ];
  for (const [id, payload] of Object.entries({
    "doublcov-report-data": {
      files: [
        {
          id: "A",
          path: "A.ts",
          displayPath: "A.ts",
          language: "typescript",
          lineCount: 1000,
          lines: [],
          functions: [],
          uncovered: { lines: [1], functions: [], branches: [] },
          sourceDataPath: "data/files/A.json",
        },
      ],
    },
    "doublcov-source-data": {
      "data/files/A.json": {
        id: "A",
        path: "A.ts",
        language: "typescript",
        lines,
      },
    },
  })) {
    const node = document.createElement("script");
    node.id = id;
    node.textContent = JSON.stringify(payload);
    document.body.append(node);
  }
  wrapper = mount(App, { attachTo: document.body });
  await flushPromises();
  await vi.waitFor(() => {
    expect(wrapper!.find("#L2 code span").attributes("style")).toContain(
      "color:",
    );
  });
  const next = wrapper
    .findAll("button")
    .find((item) => item.text().includes("Next window"))!;
  await next.trigger("click");
  await flushPromises();
  await next.trigger("click");
  await flushPromises();
  await vi.waitFor(() => {
    const rows = wrapper!.findAll(".code-line");
    expect(rows).toHaveLength(400);
    expect(rows[0]!.attributes("id")).toBe("L601");
    expect(rows.at(-1)!.attributes("id")).toBe("L1000");
    const tokens = rows[0]!.findAll("code span");
    expect(tokens.map((token) => token.text()).join("")).toBe("const x = 1;");
    expect(
      tokens.map((token) => (token.element as HTMLElement).style.color),
    ).toEqual(Array(tokens.length).fill("#6A737D"));
  });
}, 30_000);
