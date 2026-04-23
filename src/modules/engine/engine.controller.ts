import { Request, Response, NextFunction } from 'express';
import { engineService } from '../../services/engine.service';

export async function getEngineStatus(_req: Request, res: Response, next: NextFunction) {
  try {
    const enabled = await engineService.isEnabled();
    res.json({ data: { enabled } });
  } catch (err) {
    next(err);
  }
}

export async function startEngine(_req: Request, res: Response, next: NextFunction) {
  try {
    await engineService.setEnabled(true);
    res.status(200).json({ data: { enabled: true } });
  } catch (err) {
    next(err);
  }
}

export async function stopEngine(_req: Request, res: Response, next: NextFunction) {
  try {
    await engineService.setEnabled(false);
    res.status(200).json({ data: { enabled: false } });
  } catch (err) {
    next(err);
  }
}
