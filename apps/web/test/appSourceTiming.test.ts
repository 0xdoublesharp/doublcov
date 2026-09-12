import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import App from "../src/App.vue";

const highlighting = vi.hoisted(() => ({
  pending: false,
  releases: [] as Array<() => void>,
  signals: [] as Array<AbortSignal | undefined>,
}));
vi.mock("../src/syntax", () => ({
  highlightSourceLine: (text: string) => [{ text }],
  highlightSourceLines: async (
    lines: string[],
    _path: string,
    _theme: string,
    range?: { start: number; end: number },
    signal?: AbortSignal,
  ) => {
    if (highlighting.pending) {
      highlighting.signals.push(signal);
      await new Promise<void>((resolve) => highlighting.releases.push(resolve));
    }
    return lines.slice(range?.start ?? 0, range?.end).map((text) => [{ text }]);
  },
}));

let wrapper: VueWrapper | undefined;
const file = (id: string, lineCount = 1) => ({
  id,
  path: `${id}.ts`,
  displayPath: `${id}.ts`,
  language: "typescript",
  lineCount,
  lines: [],
  functions: [],
  uncovered: { lines: [1], functions: [], branches: [] },
  sourceDataPath: `data/files/${id}.json`,
});
const source = (id: string) => ({
  id,
  path: `${id}.ts`,
  language: "typescript",
  lines: [`${id}_TEXT`],
});
function embed(id: string, value: unknown) {
  const node = document.createElement("script");
  node.id = id;
  node.textContent = JSON.stringify(value);
  document.body.append(node);
}
function button(label: string) {
  return wrapper!
    .findAll("button")
    .find((item) => item.text().includes(label))!;
}
async function settle() {
  await flushPromises();
  await flushPromises();
}
async function start() {
  wrapper = mount(App, { attachTo: document.body });
  await settle();
}
beforeEach(() => {
  embed("doublcov-report-data", { files: [file("A"), file("B")] });
});
afterEach(async () => {
  highlighting.pending = false;
  highlighting.signals.length = 0;
  highlighting.releases.splice(0).forEach((release) => release());
  await settle();
  wrapper?.unmount();
  wrapper = undefined;
  document.body.innerHTML = "";
  history.replaceState(null, "", "/");
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("shows current source immediately while its highlighting is pending", async () => {
  embed("doublcov-source-data", {
    "data/files/A.json": source("A"),
    "data/files/B.json": source("B"),
  });
  await start();
  expect(wrapper!.find("code").text()).toBe("A_TEXT");
  highlighting.pending = true;
  await button("B.ts").trigger("click");
  await settle();
  expect(wrapper!.find("code").text()).toBe("B_TEXT");
  highlighting.releases.shift()!();
  await settle();
  expect(wrapper!.find("code").text()).toBe("B_TEXT");
});

it("ignores late highlighting from the middle of an A-B-A selection", async () => {
  embed("doublcov-source-data", {
    "data/files/A.json": source("A"),
    "data/files/B.json": source("B"),
  });
  await start();
  highlighting.pending = true;
  await button("B.ts").trigger("click");
  await settle();
  await button("A.ts").trigger("click");
  await settle();
  expect(wrapper!.find("code").text()).toBe("A_TEXT");
  expect(highlighting.signals[0]?.aborted).toBe(true);
  expect(highlighting.signals[1]?.aborted).toBe(false);
  highlighting.releases.pop()!();
  await settle();
  highlighting.releases.shift()!();
  await settle();
  expect(wrapper!.find("code").text()).toBe("A_TEXT");
});

it("deduplicates the initial pending source request", async () => {
  const releases: Array<(response: unknown) => void> = [];
  const fetcher = vi.fn(() => new Promise((resolve) => releases.push(resolve)));
  vi.stubGlobal("fetch", fetcher);
  await start();
  const callCount = fetcher.mock.calls.length;
  releases.forEach((resolve) =>
    resolve({ ok: true, json: async () => source("A") }),
  );
  await settle();
  expect(callCount).toBe(1);
  expect(wrapper!.find("code").text()).toBe("A_TEXT");
});

it("does not show a late failed A request on successfully loaded B", async () => {
  const releases: Array<(response: unknown) => void> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.includes("/A.")
        ? new Promise((resolve) => releases.push(resolve))
        : Promise.resolve({ ok: true, json: async () => source("B") }),
    ),
  );
  await start();
  await button("B.ts").trigger("click");
  await settle();
  expect(wrapper!.find("code").text()).toBe("B_TEXT");
  releases.forEach((resolve) => resolve({ ok: false, status: 404 }));
  await settle();
  expect(wrapper!.find("[role=alert]").exists()).toBe(false);
  expect(wrapper!.find("code").text()).toBe("B_TEXT");
});

it("does not scroll B when a previous A load succeeds late", async () => {
  const releases: Array<(response: unknown) => void> = [];
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollTo")
    .mockImplementation(() => {});
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) =>
      url.includes("/A.")
        ? new Promise((resolve) => releases.push(resolve))
        : Promise.resolve({ ok: true, json: async () => source("B") }),
    ),
  );
  await start();
  await button("B.ts").trigger("click");
  await settle();
  await wrapper!.find(".code-line button").trigger("click");
  await settle();
  scroll.mockClear();
  releases.forEach((resolve) =>
    resolve({ ok: true, json: async () => source("A") }),
  );
  await settle();
  expect(scroll).not.toHaveBeenCalled();
});

it("shares an in-flight A load across A-B-A and scrolls only the latest selection", async () => {
  const releases: Array<(response: unknown) => void> = [];
  const scroll = vi
    .spyOn(HTMLElement.prototype, "scrollTo")
    .mockImplementation(() => {});
  const fetcher = vi.fn((url: string) =>
    url.includes("/A.")
      ? new Promise((resolve) => releases.push(resolve))
      : Promise.resolve({ ok: true, json: async () => source("B") }),
  );
  vi.stubGlobal("fetch", fetcher);
  await start();
  await button("B.ts").trigger("click");
  await settle();
  await button("A.ts").trigger("click");
  await settle();
  // Select a line before its source is available, as a deep link or navigator does.
  const internal = wrapper!.vm as unknown as {
    $: { setupState: Record<string, unknown> };
  };
  internal.$.setupState.selectedLine = 1;
  await settle();
  scroll.mockClear();
  releases.forEach((resolve) =>
    resolve({ ok: true, json: async () => source("A") }),
  );
  await settle();
  expect(wrapper!.find("code").text()).toBe("A_TEXT");
  expect(wrapper!.find("[role=alert]").exists()).toBe(false);
  expect(
    fetcher.mock.calls.filter(([url]) => url.includes("/A.")),
  ).toHaveLength(1);
  expect(scroll).toHaveBeenCalledTimes(1);
});

it("retries a rejected source request and caches the successful payload", async () => {
  let failA = true;
  const fetcher = vi.fn(async (url: string) => {
    if (url.includes("/A.") && failA) throw new Error("network failed");
    return {
      ok: true,
      json: async () => source(url.includes("/A.") ? "A" : "B"),
    };
  });
  vi.stubGlobal("fetch", fetcher);
  await start();
  expect(wrapper!.find("[role=alert]").text()).toContain("network failed");
  failA = false;
  await button("A.ts").trigger("click");
  await settle();
  expect(wrapper!.find("code").text()).toBe("A_TEXT");
  expect(wrapper!.find("[role=alert]").exists()).toBe(false);
  await button("B.ts").trigger("click");
  await settle();
  await button("A.ts").trigger("click");
  await settle();
  expect(
    fetcher.mock.calls.filter(([url]) => url.includes("/A.")),
  ).toHaveLength(2);
  expect(
    fetcher.mock.calls.filter(([url]) => url.includes("/B.")),
  ).toHaveLength(1);
});

it("clamps Next and Previous to the actual first and last source lines", async () => {
  document.getElementById("doublcov-report-data")!.textContent = JSON.stringify(
    { files: [file("A", 1000)] },
  );
  embed("doublcov-source-data", {
    "data/files/A.json": {
      ...source("A"),
      lines: Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`),
    },
  });
  await start();
  function expectWindow(first: number, last: number) {
    const rows = wrapper!.findAll(".code-line");
    expect(rows).toHaveLength(400);
    expect(rows[0]!.attributes("id")).toBe(`L${first}`);
    expect(rows[0]!.find("code").text()).toBe(`line ${first}`);
    expect(rows.at(-1)!.attributes("id")).toBe(`L${last}`);
    expect(rows.at(-1)!.find("code").text()).toBe(`line ${last}`);
  }
  expectWindow(1, 400);
  await button("Next window").trigger("click");
  await settle();
  expectWindow(401, 800);
  await button("Next window").trigger("click");
  await settle();
  expectWindow(601, 1000);
  for (let i = 0; i < 3; i++) {
    await button("Next window").trigger("click");
    await settle();
    expectWindow(601, 1000);
  }
  await button("Previous window").trigger("click");
  await settle();
  expectWindow(201, 600);
  for (let i = 0; i < 3; i++) {
    await button("Previous window").trigger("click");
    await settle();
    expectWindow(1, 400);
  }
  await button("Next window").trigger("click");
  await settle();
  expectWindow(401, 800);
});
