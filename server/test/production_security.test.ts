import { describe, it } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import path from 'node:path';

const SERVER_DIR = path.resolve(import.meta.dirname, '..');

async function waitForHealth(url: string, timeoutMs = 10000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

function runSubprocessEval(envOverrides: Record<string, string>, code: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [path.join(SERVER_DIR, 'node_modules/tsx/dist/cli.mjs'), '-e', code],
      {
        cwd: SERVER_DIR,
        env: { ...process.env, ...envOverrides },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (exitCode) => resolve({ code: exitCode, stdout, stderr }));
  });
}

describe('Production Security Gates (mock-settle & provider enforcement)', () => {
  it('1. Boots real HTTP server with NODE_ENV=production & PAYMENT_PROVIDER=mock and proves /mock-settle returns 404', async () => {
    const port = 4099;
    const child = spawn(
      process.execPath,
      [path.join(SERVER_DIR, 'node_modules/tsx/dist/cli.mjs'), 'src/index.ts'],
      {
        cwd: SERVER_DIR,
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: 'production',
          PAYMENT_PROVIDER: 'mock',
          PAYPAL_PAYOUT_PROVIDER: 'simulated'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );

    let bootLogs = '';
    child.stdout.on('data', (d) => { bootLogs += d.toString(); });
    child.stderr.on('data', (d) => { bootLogs += d.toString(); });

    try {
      await waitForHealth(`http://127.0.0.1:${port}/health`, 12000);
      assert.ok(bootLogs.includes('Environment: production'), `Expected production boot banner, got:\n${bootLogs}`);

      // /api/v1/payments/mock-settle MUST NOT be registered (404, never 401/200)
      const mockRes = await fetch(`http://127.0.0.1:${port}/api/v1/payments/mock-settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: 'agr_test_001' })
      });
      assert.strictEqual(mockRes.status, 404, `Expected 404 on /mock-settle in production, got ${mockRes.status}`);

      // Confirm live /api/v1/payments/create-order IS mounted (401 auth required, not 404)
      const orderRes = await fetch(`http://127.0.0.1:${port}/api/v1/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: 'agr_test_001' })
      });
      assert.strictEqual(orderRes.status, 401, `Expected 401 on mounted /create-order, got ${orderRes.status}`);
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('2. Refuses selecting mock/simulated payout or payment provider when NODE_ENV=production', async () => {
    const evalCode = `
      (async () => {
        const { getActivePayoutProvider } = await import('./src/services/paypal/payoutProvider.ts');
        const { paypalService } = await import('./src/services/paypal/paypalClient.ts');
        const { config } = await import('./src/config/index.ts');

        // 1) config.paypal.payoutProvider must never resolve to 'simulated' in production
        if (config.paypal.payoutProvider !== 'paypal') {
          throw new Error('Expected paypal provider in production, got ' + config.paypal.payoutProvider);
        }

        // 2) Attempting to select simulated payout provider must throw
        let threwPayout = false;
        try {
          getActivePayoutProvider('simulated');
        } catch (e) {
          threwPayout = /production/i.test(e.message);
        }
        if (!threwPayout) throw new Error('getActivePayoutProvider("simulated") did not throw in production');

        // 3) Attempting simulated/mock order settlement must throw
        let threwPayment = false;
        try {
          await paypalService.settleMockOrder('agr_any', 'usr_any');
        } catch (e) {
          threwPayment = (e.details && e.details.code === 'SIMULATED_DISABLED_IN_PROD');
        }
        if (!threwPayment) throw new Error('settleMockOrder did not refuse in production');

        console.log('PROD_PROVIDER_GATES_OK');
      })();
    `;

    const res = await runSubprocessEval(
      {
        NODE_ENV: 'production',
        PAYMENT_PROVIDER: 'mock',
        PAYPAL_PAYOUT_PROVIDER: 'simulated',
        SQLITE_DB_PATH: ':memory:'
      },
      evalCode
    );
    assert.strictEqual(res.code, 0, `Subprocess failed: ${res.stderr}\n${res.stdout}`);
    assert.ok(res.stdout.includes('PROD_PROVIDER_GATES_OK'), `Missing marker in stdout: ${res.stdout}`);
  });

  it('3. Boots HTTP server with NODE_ENV=development without PAYMENT_PROVIDER=mock and confirms /mock-settle is 404', async () => {
    const port = 4098;
    const child = spawn(
      process.execPath,
      [path.join(SERVER_DIR, 'node_modules/tsx/dist/cli.mjs'), 'src/index.ts'],
      {
        cwd: SERVER_DIR,
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: 'development',
          PAYMENT_PROVIDER: 'paypal'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    try {
      await waitForHealth(`http://127.0.0.1:${port}/health`, 12000);
      const mockRes = await fetch(`http://127.0.0.1:${port}/api/v1/payments/mock-settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreementId: 'agr_test_001' })
      });
      assert.strictEqual(mockRes.status, 404, `Expected 404 when PAYMENT_PROVIDER!=mock, got ${mockRes.status}`);
    } finally {
      child.kill('SIGTERM');
    }
  });

  it('4. Enforces rate limits (429) on auth/AI/payment routes and suppresses stack traces in NODE_ENV=production', async () => {
    const port = 4097;
    const child = spawn(
      process.execPath,
      [path.join(SERVER_DIR, 'node_modules/tsx/dist/cli.mjs'), 'src/index.ts'],
      {
        cwd: SERVER_DIR,
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: 'production',
          PAYMENT_PROVIDER: 'paypal',
          RATE_LIMIT_MAX: '5'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    try {
      await waitForHealth(`http://127.0.0.1:${port}/health`, 12000);

      // 1. Trigger malformed JSON to verify error handler hides stack in production
      const badJsonRes = await fetch(`http://127.0.0.1:${port}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid-json'
      });
      const badJsonBody = await badJsonRes.json() as any;
      assert.strictEqual(badJsonRes.status, 500);
      assert.strictEqual(badJsonBody.stack, undefined, 'Production error responses must never include stack traces');

      // 2. Exceed RATE_LIMIT_MAX=5 on /api/v1/ai/status -> must return 429 RATE_LIMITED
      let saw429 = false;
      for (let i = 0; i < 7; i++) {
        const res = await fetch(`http://127.0.0.1:${port}/api/v1/ai/status`);
        if (res.status === 429) {
          const json = await res.json() as any;
          assert.strictEqual(json.code, 'RATE_LIMITED');
          saw429 = true;
          break;
        }
      }
      assert.ok(saw429, 'Expected 429 RATE_LIMITED after exceeding RATE_LIMIT_MAX');
    } finally {
      child.kill('SIGTERM');
    }
  });
});
