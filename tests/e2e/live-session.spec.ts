import { expect, test } from "@playwright/test";

test("two participants complete a researcher-controlled live session", async ({
  browser,
  request,
}) => {
  const contextOptions = {
    baseURL: "http://127.0.0.1:3000",
    permissions: ["camera", "microphone"] as ("camera" | "microphone")[],
  };
  const dashboardContext = await browser.newContext(contextOptions);
  const p01Context = await browser.newContext(contextOptions);
  const p02Context = await browser.newContext(contextOptions);

  try {
    const dashboard = await dashboardContext.newPage();
    await dashboard.goto("/dashboard");
    await dashboard.getByTestId("create-session").click();

    const p01Link = await dashboard.getByTestId("p01-link").inputValue();
    const p02Link = await dashboard.getByTestId("p02-link").inputValue();
    const code = new URL(p01Link).searchParams.get("code");
    expect(code).toMatch(/^[A-Z2-9]{6}$/);

    const p01 = await p01Context.newPage();
    const p02 = await p02Context.newPage();
    await p01.goto(p01Link);
    await p02.goto(p02Link);
    await p01.getByTestId("join-session").click();
    await p02.getByTestId("join-session").click();

    await expect(dashboard.getByText("Connected", { exact: true })).toHaveCount(2);
    await expect(p01.getByTestId("connection-status")).toContainText("Connected to P02");
    await expect(p02.getByTestId("connection-status")).toContainText("Connected to P01");

    await dashboard.getByTestId("p01-blurred").click();
    await expect(p01.getByText("Blur enabled", { exact: true }).first()).toBeVisible();

    await dashboard.getByTestId("start-spotlight-task").click();
    await expect(p01.getByTestId("participant-spotlight-task-status")).toHaveText("active");
    await expect(p02.getByTestId("participant-spotlight-task-status")).toHaveText("active");

    // Clicking an object parks that participant's spotlight on it; the focus
    // lock then commits after the dwell, so each round is gated on the
    // researcher view advancing rather than on the click itself.
    const spotlightTargets = ["mug", "moth", "key", "fern", "jar", "can"];
    for (const [index, objectId] of spotlightTargets.entries()) {
      await p01.getByTestId(`spotlight-${objectId}`).click();
      await p02.getByTestId(`spotlight-${objectId}`).click();
      if (index < spotlightTargets.length - 1) {
        await expect(
          dashboard.getByText(`Round ${index + 2} of ${spotlightTargets.length}`, {
            exact: false,
          }),
        ).toBeVisible({ timeout: 20000 });
      }
    }

    await expect(dashboard.getByTestId("spotlight-task-status")).toHaveText("completed", {
      timeout: 20000,
    });
    await expect(dashboard.getByText("spotlight_task_completed", { exact: true })).toBeVisible();

    const exportResponse = await request.get(
      `http://127.0.0.1:8000/sessions/${code}/events.csv`,
    );
    expect(exportResponse.ok()).toBeTruthy();
    expect((await exportResponse.text()).split("\n")[0]).toBe(
      '"timestamp","participant","event","value"',
    );
  } finally {
    await Promise.all([
      dashboardContext.close(),
      p01Context.close(),
      p02Context.close(),
    ]);
  }
});
