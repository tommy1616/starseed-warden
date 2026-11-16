// Render the published screenshots from shots.json with headless Chrome. It serves game/ on
// 127.0.0.1, opens each ?shot=... URL at 1280x720, waits for window.__shotReady, captures a
// JPEG and lowers its quality until the file is at most 250 KiB. Console errors and uncaught
// exceptions fail the run. Node 22 standard library only.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  Cdp,
  collectPageErrors,
  launchChrome,
  openPage,
  startStaticServer,
  waitFor,
} from './browser.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MAX_BYTES = 250 * 1024;

function jpegAt(cdp, quality) {
  return cdp.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality,
    fromSurface: true,
    clip: { x: 0, y: 0, width: 1280, height: 720, scale: 1 },
  });
}

async function capture(cdp) {
  let quality = 90;
  for (;;) {
    const result = await jpegAt(cdp, quality);
    const buffer = Buffer.from(result.data, 'base64');
    if (buffer.length <= MAX_BYTES) return { buffer, quality };
    if (quality <= 10) {
      throw new Error(`could not get under ${MAX_BYTES} bytes (last ${buffer.length} at quality ${quality})`);
    }
    quality -= 8;
  }
}

async function main() {
  const shots = JSON.parse(readFileSync(join(ROOT, 'shots.json'), 'utf8'));
  if (!Array.isArray(shots) || shots.length === 0) throw new Error('shots.json holds no scenes');
  const output = join(ROOT, 'screenshots');
  mkdirSync(output, { recursive: true });

  const { server, port } = await startStaticServer(join(ROOT, 'game'));
  const chrome = await launchChrome();
  let cdp = null;
  let failed = false;
  try {
    cdp = await Cdp.connect(await chrome.pageSocketUrl());
    await openPage(cdp);
    const errors = collectPageErrors(cdp);

    for (const shot of shots) {
      const url = `http://127.0.0.1:${port}/${shot.query ?? ''}`;
      process.stdout.write(`shooting ${shot.name} ... `);
      await cdp.send('Page.navigate', { url });
      await waitFor(cdp, 'window.__shotReady === true', 45000, `${shot.name} readiness`);
      const { buffer, quality } = await capture(cdp);
      const file = join(output, shot.name);
      writeFileSync(file, buffer);
      console.log(`${(buffer.length / 1024).toFixed(1)} KiB at q${quality}`);
    }

    if (errors.length > 0) {
      console.error('\npage errors:');
      for (const error of errors) console.error(`  - ${error}`);
      failed = true;
    }
    if (!failed) console.log(`\nshoot: PASS (${shots.length} screenshots)`);
  } finally {
    cdp?.close();
    await chrome.close();
    await new Promise((resolveClose) => server.close(resolveClose));
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`shoot: FAIL — ${error.message}`);
  process.exitCode = 1;
});
