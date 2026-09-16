import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';
import { toolsRoute } from './tools-route';
import * as tools from '../utils/run-tool';

vi.mock('../configs/paths', () => ({ CHALLENGE_DIR: '/unused' }));

it('blocks command injection through the HTTP endpoint', async () => {
  const runTool = vi.spyOn(tools, 'runTool');
  const app = express();
  app.use(express.json());
  app.post('/:block/_tools/:command', (req, res, next) => {
    toolsRoute(req, res).catch(next);
  });

  const response = await request(app)
    .post('/workshop-example/_tools/insert-step')
    .send({ num: '1; printf INJECTION_EXECUTED' });

  expect(runTool).not.toHaveBeenCalled();
  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    stdout: '',
    stderr: 'Step number or count must be a positive safe integer'
  });
});
