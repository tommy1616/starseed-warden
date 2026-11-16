// Shared plumbing for the two playtest tools: a tiny static server for game/, a headless
// Chrome launcher with remote debugging, and a minimal Chrome DevTools Protocol client over
// the global WebSocket. Node 22 standard library only; no npm packages, no network access
// beyond 127.0.0.1.
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer as createNetServer } from 'node:net';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export function startStaticServer(root) {
  const base = resolve(root);
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400).end('bad request');
      return;
    }
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = resolve(join(base, normalize(pathname)));
    if (file !== base && !file.startsWith(base + sep)) {
      response.writeHead(403).end('forbidden');
      return;
    }
    try {
      if (!statSync(file).isFile()) throw new Error('not a file');
    } catch {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    createReadStream(file).pipe(response);
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolveServer({ server, port: server.address().port });
    });
  });
}

function freePort() {
  return new Promise((resolvePort, reject) => {
    const probe = createNetServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolvePort(port));
    });
  });
}

async function waitForDevtools(port, child, timeoutMs = 20000) {
  const started = Date.now();
  let lastError = null;
  while (Date.now() - started < timeoutMs) {
    if (child.exitCode !== null) throw new Error(`Chrome exited early with code ${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return await response.json();
      lastError = new Error(`/json/version ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error(`Chrome DevTools did not start: ${lastError?.message ?? 'timeout'}`);
}

export async function launchChrome(browserPath = '/usr/bin/google-chrome') {
  const port = await freePort();
  const profile = mkdtempSync(join(tmpdir(), 'starseed-chrome-'));
  const args = [
    '--headless=new',
    '--window-size=1280,720',
    `--user-data-dir=${profile}`,
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--mute-audio',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-extensions',
    '--disable-sync',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    '--metrics-recording-only',
    'about:blank',
  ];
  const child = spawn(browserPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
    if (stderr.length > 12000) stderr = stderr.slice(-12000);
  });
  await waitForDevtools(port, child);
  return {
    port,
    child,
    profile,
    stderr: () => stderr,
    async pageSocketUrl() {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const page = list.find((target) => target.type === 'page');
      if (!page) throw new Error('no page target in Chrome');
      return page.webSocketDebuggerUrl;
    },
    async close() {
      try {
        child.kill('SIGTERM');
        await new Promise((r) => setTimeout(r, 180));
        if (child.exitCode === null) child.kill('SIGKILL');
      } catch {
        // already gone
      }
      rmSync(profile, { recursive: true, force: true });
    },
  };
}

export class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Set();
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolveOpen, reject) => {
      ws.addEventListener('open', resolveOpen, { once: true });
      ws.addEventListener('error', () => reject(new Error('WebSocket failed to open')), { once: true });
    });
    const cdp = new Cdp(ws);
    ws.addEventListener('message', (event) => cdp.receive(event.data));
    ws.addEventListener('close', () => {
      for (const { reject } of cdp.pending.values()) reject(new Error('DevTools socket closed'));
      cdp.pending.clear();
    });
    return cdp;
  }

  receive(raw) {
    let message;
    try {
      message = JSON.parse(typeof raw === 'string' ? raw : raw.toString());
    } catch {
      return;
    }
    if (message.id && this.pending.has(message.id)) {
      const { resolve: resolveCall, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`));
      else resolveCall(message.result);
      return;
    }
    for (const listener of this.listeners) {
      try {
        listener(message);
      } catch {
        // a listener must never take down the session
      }
    }
  }

  onEvent(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveCall, reject) => {
      this.pending.set(id, { resolve: resolveCall, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

export async function openPage(cdp) {
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

export async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails) {
    const details = result.exceptionDetails;
    throw new Error(details.exception?.description ?? details.text ?? 'evaluation failed');
  }
  return result.result?.value;
}

export async function waitFor(cdp, expression, timeoutMs = 30000, label = expression) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      if (await evaluate(cdp, expression)) return true;
    } catch {
      // page may still be navigating
    }
    await new Promise((r) => setTimeout(r, 60));
  }
  throw new Error(`timed out waiting for ${label}`);
}

export function collectPageErrors(cdp) {
  const errors = [];
  cdp.onEvent((message) => {
    if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
      const text = (message.params.args ?? [])
        .map((arg) => arg.value ?? arg.description ?? arg.type ?? '')
        .join(' ');
      errors.push(`console.error: ${text}`);
    } else if (message.method === 'Runtime.exceptionThrown') {
      const details = message.params.exceptionDetails;
      errors.push(`exception: ${details.exception?.description ?? details.text ?? 'unknown'}`);
    } else if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
      const entry = message.params.entry;
      errors.push(`log: ${entry.text}${entry.url ? ` (${entry.url})` : ''}`);
    }
  });
  return errors;
}

export function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

export function ensureFile(path) {
  return existsSync(path) && statSync(path).isFile();
}
