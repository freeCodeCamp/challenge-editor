import { Request, Response } from 'express';
import { superBlockStages } from '../configs/super-block-list';

export const indexRoute = (req: Request, res: Response): void => {
  res.json(superBlockStages);
};
