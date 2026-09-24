import express from "express";
import cors from "cors";
import { analysesRouter } from "./routes/analyses.js";
import { startWorker, startCleanupLoop } from "./jobs/worker.js";
import { config } from "./config.js";

export function createApp(): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/analyses", analysesRouter);

  // Global error handler
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if ((err as { type?: string }).type === "entity.too.large") {
        res.status(413).json({
          error: { code: "FILE_TOO_LARGE", message: "Request body too large" },
        });
        return;
      }
      const message = err instanceof Error ? err.message : "Internal server error";
      res.status(500).json({
        error: { code: "INTERNAL_ERROR", message },
      });
    }
  );

  return app;
}

if (require.main === module) {
  const app = createApp();
  startWorker();
  startCleanupLoop();
  app.listen(config.port, () => {
    console.log(`Code Archaeologist API listening on port ${config.port}`);
  });
}
