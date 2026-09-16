import { realpath, stat } from 'fs/promises';
import { dirname, join } from 'path';

const commands = [
  'create-next-step',
  'create-empty-steps',
  'insert-step',
  'delete-step',
  'update-step-titles'
] as const;

type Command = (typeof commands)[number];

type ToolInput = {
  block: string;
  command: Command;
  num?: number;
};

export const validateToolInput = (
  block: unknown,
  command: unknown,
  num: unknown
): ToolInput => {
  if (!commands.some(allowed => allowed === command)) {
    throw new Error('Command not found');
  }
  if (typeof block !== 'string' || !/^[a-z0-9-]+$/.test(block)) {
    throw new Error('Invalid block name');
  }
  const parsed = command as Command;
  if (parsed === 'create-next-step' || parsed === 'update-step-titles') {
    return { block, command: parsed };
  }
  if (typeof num !== 'number' || !Number.isSafeInteger(num) || num < 1) {
    throw new Error('Step number or count must be a positive safe integer');
  }
  return { block, command: parsed, num };
};

export const resolveBlockDirectory = async (root: string, block: string) => {
  let directory: string;
  try {
    root = await realpath(root);
    directory = await realpath(join(root, block));
    if (dirname(directory) !== root || !(await stat(directory)).isDirectory()) {
      throw new Error('Invalid block directory');
    }
  } catch {
    throw new Error('Invalid block directory');
  }
  return directory;
};
