import { expect, test, type Page } from "@playwright/test";

async function expectRemoteVideoPlaying(page: Page, participant: "P01" | "P02") {
  const video = page
    .getByTestId(`${participant.toLowerCase()}-participant-tile`)
    .locator("video");
  await expect(video).toBeVisible();

  const readState = () =>
    video.evaluate((element) => {
      const media = element as HTMLVideoElement;
      const stream = media.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      return {
        currentTime: media.currentTime,
        readyState: media.readyState,
        videoWidth: media.videoWidth,
        trackMuted: track?.muted ?? true,
        trackReadyState: track?.readyState ?? "ended",
      };
    });

  const before = await readState();
  await page.waitForTimeout(700);
  const after = await readState();

  expect(after.readyState).toBeGreaterThanOrEqual(2);
  expect(after.videoWidth).toBeGreaterThan(0);
  expect(after.trackReadyState).toBe("live");
  expect(after.trackMuted).toBe(false);
  expect(after.currentTime).toBeGreaterThan(before.currentTime);
}

async function expectClueNearOwnSpotlight(
  page: import("@playwright/test").Page,
  participant: "P01" | "P02",
) {
  const clue = page.getByTestId("self-clue-tag");
  await expect(clue).toBeVisible();
  await expect(clue).toHaveAttribute("data-participant", participant);

  const [clueBox, p01Box, p02Box] = await Promise.all([
    clue.boundingBox(),
    page.locator(".sl-gel-p01").boundingBox(),
    page.locator(".sl-gel-p02").boundingBox(),
  ]);
  expect(clueBox).not.toBeNull();
  expect(p01Box).not.toBeNull();
  expect(p02Box).not.toBeNull();

  const center = (box: NonNullable<typeof clueBox>) => ({
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  });
  const distance = (
    a: ReturnType<typeof center>,
    b: ReturnType<typeof center>,
  ) => Math.hypot(a.x - b.x, a.y - b.y);
  const clueCenter = center(clueBox!);
  const ownCenter = center(participant === "P01" ? p01Box! : p02Box!);
  const partnerCenter = center(participant === "P01" ? p02Box! : p01Box!);

  expect(distance(clueCenter, ownCenter)).toBeLessThan(
    distance(clueCenter, partnerCenter),
  );
}

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
    const researcherToken = new URL(dashboard.url()).searchParams.get("token");
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect(researcherToken).toBeTruthy();

    const p01 = await p01Context.newPage();
    const p02 = await p02Context.newPage();
    await p01.goto(p01Link);
    await p02.goto(p02Link);
    await p01.getByTestId("join-session").click();
    await p02.getByTestId("join-session").click();

    await expect(
      dashboard.getByTestId("p01-researcher-feed").getByText("Connected", { exact: true }),
    ).toBeVisible();
    await expect(
      dashboard.getByTestId("p02-researcher-feed").getByText("Connected", { exact: true }),
    ).toBeVisible();
    await expect(
      dashboard.getByTestId("p01-researcher-feed").getByText("Camera on", { exact: true }),
    ).toBeVisible();
    await expect(
      dashboard.getByTestId("p02-researcher-feed").locator("video"),
    ).toBeVisible({ timeout: 20000 });
    await expect(p01.getByTestId("connection-status")).toContainText("Connected to P02");
    await expect(p02.getByTestId("connection-status")).toContainText("Connected to P01");
    await expectRemoteVideoPlaying(p02, "P01");

    const conditionLabels = {
      blurred: "Blur enabled",
      grayscale: "Grayscale enabled",
      reducedFrameRate: "Reduced to approximately 6 fps",
    } as const;
    for (const [condition, label] of Object.entries(conditionLabels)) {
      await dashboard.getByTestId("p01-condition-select").selectOption(condition);
      await expect(p01.getByText(label, { exact: true }).first()).toBeVisible();
      await expectRemoteVideoPlaying(p02, "P01");
    }

    await dashboard.getByTestId("p01-condition-select").selectOption("disabled");
    await expect(p01.getByText("Video disabled", { exact: true }).first()).toBeVisible();
    await dashboard.getByTestId("p01-condition-select").selectOption("normal");
    await expect(p01.getByText("Normal video", { exact: true }).first()).toBeVisible();
    await expectRemoteVideoPlaying(p02, "P01");

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
            exact: true,
          }),
        ).toBeVisible({ timeout: 20000 });
      }
    }

    await expect(dashboard.getByTestId("spotlight-task-status")).toHaveText("completed", {
      timeout: 20000,
    });
    await expect(dashboard.getByText("spotlight_task_completed", { exact: true })).toBeVisible();

    const exportResponse = await request.get(
      `http://127.0.0.1:8000/sessions/${code}/events.csv?token=${encodeURIComponent(researcherToken!)}`,
    );
    expect(exportResponse.ok()).toBeTruthy();
    expect((await exportResponse.text()).split("\n")[0]).toBe(
      '"schema_version","session_code","event_id","sequence","elapsed_ms","recorded_at_utc","round","participant","event","payload_json","value"',
    );
  } finally {
    await Promise.all([
      dashboardContext.close(),
      p01Context.close(),
      p02Context.close(),
    ]);
  }
});

test("the simulated partner clue stays private in both guidance modes", async ({
  page,
}) => {
  await page.goto("/spotlight-sync");
  await page.getByTestId("start-spotlight-demo").click();
  await expect(page.getByTestId("partner-private-clue-state")).toHaveText(
    "Listen for their clue",
  );

  await page.getByRole("button", { name: "Silent" }).click();
  await expect(page.getByTestId("partner-private-clue-state")).toHaveText(
    "Follow their spotlight",
  );
});

test("participants can join without camera or microphone", async ({ browser }) => {
  const dashboardContext = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  const p01Context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });
  const p02Context = await browser.newContext({
    baseURL: "http://127.0.0.1:3000",
  });

  try {
    const dashboard = await dashboardContext.newPage();
    await dashboard.goto("/dashboard");
    await dashboard.getByTestId("create-session").click();

    const p01Link = await dashboard.getByTestId("p01-link").inputValue();
    const p02Link = await dashboard.getByTestId("p02-link").inputValue();
    const p01 = await p01Context.newPage();
    const p02 = await p02Context.newPage();
    await p01.goto(p01Link);
    await p02.goto(p02Link);
    await p01.getByTestId("join-without-media").click();
    await p02.getByTestId("join-without-media").click();

    await expect(
      dashboard.getByTestId("p01-researcher-feed").getByText("Camera off", { exact: true }),
    ).toBeVisible();
    await expect(
      dashboard.getByTestId("p02-researcher-feed").getByText("Mic off", { exact: true }),
    ).toBeVisible();
    await expect(
      dashboard.getByText("Both participants are connected.", { exact: true }),
    ).toBeVisible();
    await expect(dashboard.getByTestId("start-spotlight-task")).toBeEnabled();
    await expect(p01.getByTestId("connection-status")).toContainText("Connected to P02");
    await expect(p02.getByTestId("connection-status")).toContainText("Connected to P01");

    await dashboard.getByTestId("start-spotlight-task").click();
    await expect(p01.getByTestId("participant-spotlight-task-status")).toHaveText("active");
    await expect(p02.getByTestId("participant-spotlight-task-status")).toHaveText("active");
    await expectClueNearOwnSpotlight(p01, "P01");
    await expectClueNearOwnSpotlight(p02, "P02");
  } finally {
    await Promise.all([
      dashboardContext.close(),
      p01Context.close(),
      p02Context.close(),
    ]);
  }
});
