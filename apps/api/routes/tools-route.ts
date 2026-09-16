import { execFile } from 'child_process';
import { realpath, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { promisify } from 'util';

import { Request, Response } from 'express';
import { ToolsSwitch } from '../interfaces/tools';
import { CHALLENGE_DIR } from '../configs/paths';

const asyncExecFile = promisify(execFile);

const runTool = (
  directory: string,
  command: keyof ToolsSwitch,
  num?: number
) => {
  const args = ['--silent', 'run', command];
  if (num !== undefined) args.push(String(num));

  // pnpm supplies either a JavaScript CLI or a standalone executable.
  // Launch JavaScript through Node, avoiding the pnpm.cmd shell on Windows.
  const pnpmPath = process.env.npm_execpath;
  if (pnpmPath && /\.[cm]?js$/i.test(pnpmPath)) {
    return asyncExecFile(process.execPath, [pnpmPath, ...args], {
      cwd: directory
    });
  }
  return asyncExecFile(pnpmPath || 'pnpm', args, { cwd: directory });
};

const toolsSwitch: ToolsSwitch = {
  'create-next-step': directory => runTool(directory, 'create-next-step'),
  'create-empty-steps': (directory, num) =>
    runTool(directory, 'create-empty-steps', num),
  'insert-step': (directory, num) => runTool(directory, 'insert-step', num),
  'delete-step': (directory, num) => runTool(directory, 'delete-step', num),
  'update-step-titles': directory => runTool(directory, 'update-step-titles')
};

export const toolsRoute = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { block, command } = req.params;

  if (!Object.prototype.hasOwnProperty.call(toolsSwitch, command)) {
    res.status(400).json({ stdout: '', stderr: 'Command not found' });
    return;
  }

  if (!/^[a-z0-9-]+$/.test(block)) {
    res.status(400).json({ stdout: '', stderr: 'Invalid block name' });
    return;
  }

  const { num } = (req.body ?? {}) as { num?: unknown };
  const needsNumber = [
    'create-empty-steps',
    'insert-step',
    'delete-step'
  ].includes(command);
  if (
    needsNumber &&
    (typeof num !== 'number' || !Number.isSafeInteger(num) || num < 1)
  ) {
    res.status(400).json({
      stdout: '',
      stderr: 'Step number or count must be a positive safe integer'
    });
    return;
  }

  let directory: string;
  try {
    const root = await realpath(CHALLENGE_DIR);
    directory = await realpath(join(root, block));
    if (dirname(directory) !== root || !(await stat(directory)).isDirectory()) {
      res.status(400).json({ stdout: '', stderr: 'Invalid block directory' });
      return;
    }
  } catch {
    res.status(400).json({ stdout: '', stderr: 'Unknown block directory' });
    return;
  }

  try {
    const parsed = command as keyof ToolsSwitch;
    const { stdout, stderr } = await toolsSwitch[parsed](
      directory,
      num as number
    );
    res.json({ stdout, stderr });
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    res.status(500).json({
      stdout: failure.stdout ?? '',
      stderr: failure.stderr || failure.message
    });
  }
};
