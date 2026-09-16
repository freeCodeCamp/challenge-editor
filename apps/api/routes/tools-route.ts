import { Request, Response } from 'express';
import { CHALLENGE_DIR } from '../configs/paths';
import {
  resolveBlockDirectory,
  validateToolInput
} from '../utils/validate-tool-input';
import { runTool } from '../utils/run-tool';

export const toolsRoute = async (
  req: Request<{ block: string; command: string }>,
  res: Response
): Promise<void> => {
  let input: ReturnType<typeof validateToolInput>;
  let directory: string;
  try {
    const { num } = (req.body ?? {}) as { num?: unknown };
    input = validateToolInput(req.params.block, req.params.command, num);
    directory = await resolveBlockDirectory(CHALLENGE_DIR, input.block);
  } catch (error) {
    res.status(400).json({ stdout: '', stderr: (error as Error).message });
    return;
  }

  try {
    const { stdout, stderr } = await runTool(directory, input);
    res.json({ stdout, stderr });
  } catch (error) {
    const failure = error as Error & { stdout?: string; stderr?: string };
    res.status(500).json({
      stdout: failure.stdout ?? '',
      stderr: failure.stderr || failure.message
    });
  }
};
