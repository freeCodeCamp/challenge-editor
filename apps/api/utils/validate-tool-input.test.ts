import { mkdtemp, mkdir, rm, symlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  resolveBlockDirectory,
  validateToolInput
} from './validate-tool-input';

describe('validateToolInput', () => {
  it.each(['create-next-step', 'update-step-titles'])(
    'accepts %s and discards unused num input',
    command => {
      expect(
        validateToolInput('workshop-example', command, '; touch marker')
      ).toEqual({
        block: 'workshop-example',
        command
      });
    }
  );

  describe.each(['create-empty-steps', 'insert-step', 'delete-step'])(
    '%s',
    command => {
      it.each([1, 2, Number.MAX_SAFE_INTEGER])(
        'accepts the positive safe integer %s',
        num => {
          expect(validateToolInput('workshop-example', command, num)).toEqual({
            block: 'workshop-example',
            command,
            num
          });
        }
      );
      it.each([
        '1; touch marker',
        '1',
        0,
        -1,
        1.5,
        null,
        undefined,
        {},
        [],
        true,
        NaN,
        Infinity,
        Number.MAX_SAFE_INTEGER + 1
      ])('rejects invalid num %j', num => {
        expect(() =>
          validateToolInput('workshop-example', command, num)
        ).toThrow('positive safe integer');
      });
    }
  );

  it.each([
    'unknown',
    'toString',
    'constructor',
    '__proto__',
    'create-next-step; touch marker',
    undefined
  ])('rejects command %s', command => {
    expect(() => validateToolInput('workshop-example', command, 1)).toThrow(
      'Command not found'
    );
  });
  it.each([
    '',
    'missing; touch marker',
    '$(touch marker)',
    '../outside',
    'workshop-example/../../outside',
    '/tmp',
    undefined
  ])('rejects block %s', block => {
    expect(() =>
      validateToolInput(block, 'create-next-step', undefined)
    ).toThrow('Invalid block name');
  });
});

describe('resolveBlockDirectory', () => {
  let fixture: string;
  let root: string;
  beforeAll(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'tools-validator-'));
    root = join(fixture, 'blocks');
    await mkdir(join(root, 'workshop-example'), { recursive: true });
    await mkdir(join(fixture, 'outside'));
    await writeFile(join(root, 'regular-file'), '');
    await symlink(join(fixture, 'outside'), join(root, 'escape'));
  });
  afterAll(async () => {
    await rm(fixture, { recursive: true, force: true });
  });
  it('resolves an existing block directory', async () => {
    await expect(resolveBlockDirectory(root, 'workshop-example')).resolves.toBe(
      join(root, 'workshop-example')
    );
  });
  it.each(['missing', 'regular-file', 'escape'])('rejects %s', async block => {
    await expect(resolveBlockDirectory(root, block)).rejects.toThrow(
      'Invalid block directory'
    );
  });
});
