import { expect, test } from "@playwright/test";

test("source windows preserve comment context and navigate back from the last window", async ({
  page,
}) => {
  await page.route("http://127.0.0.1:60733/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const body = html.replace(
      /(<script type="application\/json" id="doublcov-source-data">)([\s\S]*?)(<\/script>)/,
      (_match, open: string, json: string, close: string) => {
        const sources = JSON.parse(json) as Record<string, { lines: string[] }>;
        const source = Object.values(sources)[0]!;
        source.lines = Array.from({ length: 1000 }, (_, index) =>
          index === 0
            ? "/*"
            : index === 900
              ? "*/"
              : `uint256 value_${index} = 1;`,
        );
        return `${open}${JSON.stringify(sources)}${close}`;
      },
    );
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await expect(page.locator(".code-line")).toHaveCount(400);
  await expect(page.locator(".code-line").first()).toHaveAttribute("id", "L1");
  const firstComment = page.locator("#L1 code span").first();
  await expect(firstComment).toHaveAttribute("style", /color:/);
  const commentColor = await firstComment.evaluate(
    (element) => getComputedStyle(element).color,
  );

  const next = page.getByRole("button", { name: "Next window" });
  const previous = page.getByRole("button", { name: "Previous window" });
  await next.click();
  await expect(page.locator(".code-line").first()).toHaveAttribute(
    "id",
    "L401",
  );
  await expect(page.locator(".code-line").last()).toHaveAttribute("id", "L800");
  await expect(page.locator("#L401 code span")).toHaveCount(1);
  await expect(page.locator("#L401 code span")).toHaveCSS(
    "color",
    commentColor,
  );

  await next.click();
  for (let index = 0; index < 2; index += 1) {
    if (await next.isEnabled()) await next.click();
  }
  await expect(page.locator(".code-line").first()).toHaveAttribute(
    "id",
    "L601",
  );
  await expect(page.locator(".code-line").last()).toHaveAttribute(
    "id",
    "L1000",
  );
  await previous.click();
  await expect(page.locator(".code-line").first()).toHaveAttribute(
    "id",
    "L201",
  );
  await previous.click();
  await expect(page.locator(".code-line").first()).toHaveAttribute("id", "L1");
});

test("renders a generated report and navigates to uncovered source", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { name: "Playwright Fixture Coverage" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "src/Counter.sol" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Diagnostics" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: /Line 10.*line.*src\/Counter\.sol:10/ })
    .click();

  await expect(page).toHaveURL(/line=10/);
  await expect(page.locator("#L10")).toContainText("} else {");
});

test("sanitizes untrusted report customization in the browser", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByText("Unsafe Link")).toBeVisible();
  await expect(page.getByRole("link", { name: "Safe Link" })).toHaveAttribute(
    "href",
    "https://example.test/report",
  );
  await expect(page.locator("a", { hasText: "Unsafe Link" })).toHaveCount(0);
  await expect(page.locator("strong")).toHaveCount(0);
  await expect(
    page.getByText("<strong>rendered as text</strong>"),
  ).toBeVisible();

  const backgroundToken = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--bg"),
  );
  expect(backgroundToken).not.toContain("javascript:");
});
