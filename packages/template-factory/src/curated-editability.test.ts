import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { chromium } from '@playwright/test';
import { exportCuratedTemplates } from './curated-export.js';
import { startTemplateServer, type RenderTask } from './legacy/render.js';

test('curated hero artwork leaves text editable and its background selectable without stealing text clicks', { timeout: 60_000 }, async () => {
  const scratch = await mkdtemp(join(tmpdir(), 'curated-editability-'));
  const root = join(scratch, 'library');
  const report = await exportCuratedTemplates({ outputRoot: root, niches: ['aromatherapy'] });
  const selected = report.templates.filter((entry) => /-(?:01|09)$/.test(entry.slug));
  const tasks: RenderTask[] = selected.map((entry) => ({
    key: `${entry.niche}/${entry.slug}`, niche: entry.niche, slug: entry.slug,
    page: 'index.html', templateDir: join(root, entry.niche, entry.slug),
  }));
  const server = await startTemplateServer(root, { renderTasks: tasks });
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport });
      await page.addInitScript(() => {
        (window as unknown as { auditMessages: unknown[] }).auditMessages = [];
        window.addEventListener('message', (event) => {
          (window as unknown as { auditMessages: unknown[] }).auditMessages.push(event.data);
        });
      });
      for (const task of tasks) {
        await page.goto(`${server.origin}/${task.key}/index.html`);
        const heading = page.locator('h1').first();
        await heading.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await heading.dblclick();
        assert.equal(await heading.evaluate((element) => (element as HTMLElement).isContentEditable), true);
        await heading.fill('A physically editable heading');
        await heading.press('Tab');
        await page.waitForFunction(() => (window as unknown as { auditMessages: Array<{ type: string }> })
          .auditMessages.some((message) => message.type === 'textEdited'));

        // Clicking the text never opens the background picker.
        assert.equal(await page.evaluate(() => (window as unknown as { auditMessages: Array<{ type: string }> })
          .auditMessages.some((message) => message.type === 'imageSwapRequest')), false);

        const hero = page.locator('.hero-bg').first();
        await hero.evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
        const point = await hero.evaluate((element) => {
          const bounds = element.getBoundingClientRect();
          for (let y = Math.max(20, bounds.top + 12); y < Math.min(innerHeight - 20, bounds.bottom - 12); y += 32) {
            for (let x = Math.max(20, bounds.left + 12); x < Math.min(innerWidth - 20, bounds.right - 12); x += 40) {
              let hit = document.elementFromPoint(x, y);
              let safe = true;
              while (hit && hit !== element) {
                if (hit.matches('a[href],button,input,select,textarea,option,label,summary')
                    || (hit.hasAttribute('data-dc-edit-id') && hit.children.length === 0)
                    || (hit.hasAttribute('data-dc-image-id') && !hit.matches('img.hero-bg-img'))) { safe = false; break; }
                hit = hit.parentElement;
              }
              if (safe && hit === element) return { x, y };
            }
          }
          return null;
        });
        assert.ok(point, `${task.slug}: a blank hero surface must remain reachable`);
        await page.mouse.click(point.x, point.y);
        await page.waitForFunction(() => (window as unknown as { auditMessages: Array<{ type: string }> })
          .auditMessages.some((message) => message.type === 'imageSwapRequest'));
      }
      await page.close();
    }
  } finally {
    await browser.close();
    await server.close();
    await rm(scratch, { recursive: true, force: true });
  }
});
