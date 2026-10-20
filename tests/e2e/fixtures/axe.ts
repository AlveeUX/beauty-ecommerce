import AxeBuilder from "@axe-core/playwright";
import { test, type Page } from "@playwright/test";

/**
 * Accessibility gate used by the E2E suite: fails on any critical/serious axe violation
 * EXCEPT color contrast.
 *
 * Contrast is excluded on purpose: the project owner chose to keep the Figma colors exactly
 * (docs/decision-log.md D-033), and some Figma pairs are below WCAG AA 4.5:1 (muted gray on the
 * beige cards, struck-through prices, red on dark). The number of contrast findings is still
 * recorded as a test annotation so the debt stays visible.
 */
export async function expectNoSeriousViolations(page: Page, include?: string) {
  const builder = new AxeBuilder({ page }).disableRules(["color-contrast"]);
  const results = await (include ? builder.include(include) : builder).analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );

  const contrast = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
  const count = contrast.violations.reduce((n, v) => n + v.nodes.length, 0);
  test.info().annotations.push({
    type: "known-contrast-findings",
    description: `${count} (accepted, see D-033)`,
  });

  return blocking.map(
    (v) =>
      `${v.id}: ${v.help} [${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(" "))
        .join(" | ")}]`,
  );
}
