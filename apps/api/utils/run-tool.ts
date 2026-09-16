import { execFile } from 'child_process';
import { promisify } from 'util';
import { validateToolInput } from './validate-tool-input';

const asyncExecFile = promisify(execFile);

export const runTool = (
  directory: string,
  { command, num }: ReturnType<typeof validateToolInput>
) => {
  const args = ['--silent', 'run', command];
  if (num !== undefined) args.push(String(num));
  return asyncExecFile('pnpm', args, { cwd: directory });
};
