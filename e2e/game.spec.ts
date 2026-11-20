import { expect, test } from '@playwright/test';

test.describe('Game loop Starship E2E', () => {
  test('loads canvas, joins room, sends movement and fire input without console/page errors', async ({
    page
  }) => {
    const errors: string[] = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    const joinBtn = page.locator('#join-btn');
    await expect(joinBtn).toBeVisible({ timeout: 15_000 });
    await joinBtn.click();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10_000 });

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
    expect(box!.height).toBeGreaterThan(100);

    await page.keyboard.down('ArrowRight');
    await page.keyboard.down('Space');
    await page.waitForTimeout(300);
    await page.keyboard.up('Space');
    await page.keyboard.up('ArrowRight');

    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });
});