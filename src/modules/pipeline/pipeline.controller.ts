import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { postingPipelineService } from '../../services/posting-pipeline.service';

const runPipelineSchema = z.object({
  scheduleId: z.string().uuid(),
  style: z.enum(['professional', 'storytelling', 'viral_hook']).optional(),
  additionalContext: z.string().max(2000).optional(),
  autoPublish: z.boolean().optional(),
});

export async function runPipeline(req: Request, res: Response, next: NextFunction) {
  try {
    const data = runPipelineSchema.parse(req.body);
    const result = await postingPipelineService.enqueue(data);
    res.status(202).json({ data: result });
  } catch (err) {
    next(err);
  }
}
