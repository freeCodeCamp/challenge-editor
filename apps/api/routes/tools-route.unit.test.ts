import { Request, Response } from 'express';
import { beforeEach, expect, it, vi } from 'vitest';
import { toolsRoute } from './tools-route';
import { runTool } from '../utils/run-tool';
import { resolveBlockDirectory } from '../utils/validate-tool-input';

vi.mock('../configs/paths', () => ({ CHALLENGE_DIR: '/blocks' }));
vi.mock('../utils/run-tool');
vi.mock('../utils/validate-tool-input', async importOriginal => ({
  ...(await importOriginal<typeof import('../utils/validate-tool-input')>()),
  resolveBlockDirectory: vi.fn()
}));

const req = {
  params: { block: 'workshop-example', command: 'insert-step' },
  body: { num: 2 }
} as Request<{ block: string; command: string }>;
const res = {
  status: vi.fn().mockReturnThis(),
  json: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resolveBlockDirectory).mockResolvedValue(
    '/blocks/workshop-example'
  );
});

it('runs the validated tool in the resolved block directory', async () => {
  vi.mocked(runTool).mockResolvedValue({
    stdout: 'tool completed',
    stderr: ''
  });

  await toolsRoute(req, res as unknown as Response);

  expect(resolveBlockDirectory).toHaveBeenCalledWith(
    '/blocks',
    'workshop-example'
  );
  expect(runTool).toHaveBeenCalledWith('/blocks/workshop-example', {
    block: 'workshop-example',
    command: 'insert-step',
    num: 2
  });
  expect(res.json).toHaveBeenCalledWith({
    stdout: 'tool completed',
    stderr: ''
  });
});

it('does not launch a tool for an invalid directory', async () => {
  vi.mocked(resolveBlockDirectory).mockRejectedValue(
    new Error('Invalid block directory')
  );

  await toolsRoute(req, res as unknown as Response);

  expect(runTool).not.toHaveBeenCalled();
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith({
    stdout: '',
    stderr: 'Invalid block directory'
  });
});

it('preserves subprocess output on failure', async () => {
  vi.mocked(runTool).mockRejectedValue(
    Object.assign(new Error('Command failed'), {
      stdout: 'partial output',
      stderr: 'tool failed'
    })
  );

  await toolsRoute(req, res as unknown as Response);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    stdout: 'partial output',
    stderr: 'tool failed'
  });
});

it('returns the error message when a subprocess cannot start', async () => {
  vi.mocked(runTool).mockRejectedValue(new Error('spawn pnpm ENOENT'));

  await toolsRoute(req, res as unknown as Response);

  expect(res.status).toHaveBeenCalledWith(500);
  expect(res.json).toHaveBeenCalledWith({
    stdout: '',
    stderr: 'spawn pnpm ENOENT'
  });
});
