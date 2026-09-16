import assert from 'node:assert/strict';
import { once } from 'node:events';
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
// The API uses Node's test runner; it has no Vitest dependency.
// eslint-disable-next-line vitest/no-import-node-test
import { after, before, test } from 'node:test';
import express from 'express';

let fixture: string;
let baseUrl: string;
let blockDirectory: string;
let callsFile: string;
let server: ReturnType<ReturnType<typeof express>['listen']>;
const originalRepo = process.env.FCC_REPO_LOCATION;
const originalPnpm = process.env.npm_execpath;

before(async () => {
  fixture = await mkdtemp(join(tmpdir(), 'tools-route-'));
  const root = join(fixture, 'curriculum/challenges/english/blocks');
  blockDirectory = join(root, 'workshop-example');
  await mkdir(blockDirectory, { recursive: true });
  await writeFile(join(root, 'regular-file'), '');
  await mkdir(join(fixture, 'outside'));
  await symlink(join(fixture, 'outside'), join(root, 'escape'), 'junction');
  callsFile = join(fixture, 'calls.jsonl');
  await writeFile(callsFile, '');
  const pnpmPath = join(fixture, 'fake pnpm.cjs');
  await writeFile(
    pnpmPath,
    `const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(callsFile)}, JSON.stringify({ args, cwd: process.cwd() }) + '\\n');
if (args[2] === 'update-step-titles') {
  process.stdout.write('partial output');
  process.stderr.write('tool failed');
  process.exitCode = 1;
} else {
  process.stdout.write('tool completed');
}`
  );
  process.env.FCC_REPO_LOCATION = relative(process.cwd(), fixture);
  process.env.npm_execpath = pnpmPath;
  const { toolsRoute } = await import('./tools-route');
  const app = express();
  app.use(express.json());
  app.post('/:superblock/:block/_tools/:command', (req, res, next) => {
    toolsRoute(req, res).catch(next);
  });
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
  if (originalRepo === undefined) delete process.env.FCC_REPO_LOCATION;
  else process.env.FCC_REPO_LOCATION = originalRepo;
  if (originalPnpm === undefined) delete process.env.npm_execpath;
  else process.env.npm_execpath = originalPnpm;
  if (fixture) await rm(fixture, { recursive: true, force: true });
});

const request = (block: string, command: string, body?: unknown) =>
  fetch(`${baseUrl}/ignored/${encodeURIComponent(block)}/_tools/${command}`, {
    method: 'POST',
    ...(body === undefined
      ? {}
      : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
  });

void test('rejects shell syntax, traversal, and invalid directories without launching a tool', async () => {
  const before = await readFile(callsFile, 'utf8');
  for (const block of [
    'missing;printf BLOCK_INJECTION_OK;#',
    '$(printf BLOCK_INJECTION_OK)',
    '../outside',
    'workshop-example/../../outside',
    'missing',
    'regular-file',
    'escape'
  ]) {
    const response = await request(block, 'create-next-step');
    assert.equal(response.status, 400, block);
    const result = (await response.json()) as {
      stdout: string;
      stderr: string;
    };
    assert.equal(result.stdout, '');
    assert.ok(result.stderr);
  }
  assert.equal(await readFile(callsFile, 'utf8'), before);
});

void test('rejects invalid step numbers and counts without launching a tool', async () => {
  const before = await readFile(callsFile, 'utf8');
  for (const command of ['create-empty-steps', 'insert-step', 'delete-step']) {
    for (const num of [
      '1;printf NUM_INJECTION_OK',
      '1',
      0,
      -1,
      1.5,
      null,
      {},
      [],
      true,
      Number.MAX_SAFE_INTEGER + 1
    ]) {
      const response = await request('workshop-example', command, { num });
      assert.equal(response.status, 400, `${command}: ${JSON.stringify(num)}`);
      await response.arrayBuffer();
    }
    const response = await request('workshop-example', command);
    assert.equal(response.status, 400);
    await response.arrayBuffer();
  }
  assert.equal(await readFile(callsFile, 'utf8'), before);
});

void test('rejects unknown and inherited command names', async () => {
  const before = await readFile(callsFile, 'utf8');
  for (const command of ['unknown', 'toString', 'constructor', '__proto__']) {
    const response = await request('workshop-example', command);
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      stdout: '',
      stderr: 'Command not found'
    });
  }
  assert.equal(await readFile(callsFile, 'utf8'), before);
});

void test('runs supported tools with separate arguments in the block directory', async () => {
  for (const command of [
    'create-next-step',
    'create-empty-steps',
    'insert-step',
    'delete-step'
  ]) {
    const needsNumber = command !== 'create-next-step';
    const response = await request(
      'workshop-example',
      command,
      needsNumber ? { num: 2 } : undefined
    );
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      stdout: 'tool completed',
      stderr: ''
    });
    const calls = (await readFile(callsFile, 'utf8')).trim().split('\n');
    assert.deepEqual(JSON.parse(calls[calls.length - 1]), {
      args: ['--silent', 'run', command, ...(needsNumber ? ['2'] : [])],
      cwd: blockDirectory
    });
  }
});

void test('returns subprocess output as JSON on failure', async () => {
  const response = await request('workshop-example', 'update-step-titles');
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), {
    stdout: 'partial output',
    stderr: 'tool failed'
  });
});

void test('preserves pnpm script working-directory behavior', async () => {
  await writeFile(
    join(fixture, 'package.json'),
    JSON.stringify({
      private: true,
      scripts: { 'create-next-step': 'node probe.cjs' }
    })
  );
  await writeFile(
    join(fixture, 'probe.cjs'),
    'process.stdout.write(JSON.stringify({ cwd: process.cwd(), initCwd: process.env.INIT_CWD }));'
  );
  const fakePnpm = process.env.npm_execpath;
  try {
    for (const pnpmPath of [originalPnpm, undefined]) {
      if (pnpmPath === undefined) delete process.env.npm_execpath;
      else process.env.npm_execpath = pnpmPath;
      const response = await request('workshop-example', 'create-next-step');
      const result = (await response.json()) as {
        stdout: string;
        stderr: string;
      };
      assert.equal(response.status, 200, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), {
        cwd: fixture,
        initCwd: blockDirectory
      });
    }
  } finally {
    process.env.npm_execpath = fakePnpm;
  }
});
