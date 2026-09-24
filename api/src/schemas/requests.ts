import { z } from "zod";
import { JobRecord } from "./job.js";

export const RepositoryRequest = z.object({
  url: z
    .string()
    .url()
    .refine(
      (u) => {
        try {
          return new URL(u).hostname === "github.com";
        } catch {
          return false;
        }
      },
      { message: "Only github.com repositories are accepted" }
    )
    .refine((u) => /^https:\/\/github\.com\/[^/]+\/[^/?#]+/.test(u), {
      message: "URL must be https://github.com/<owner>/<repo>",
    }),
});
export type RepositoryRequest = z.infer<typeof RepositoryRequest>;

export const JobAcceptedResponse = z.object({
  jobId: z.string().uuid(),
  status: z.literal("queued"),
  createdAt: z.string().datetime(),
  links: z.object({
    status: z.string(),
    report: z.string(),
  }),
});
export type JobAcceptedResponse = z.infer<typeof JobAcceptedResponse>;

export const JobStatusResponse = JobRecord.omit({ workDir: true });
export type JobStatusResponse = z.infer<typeof JobStatusResponse>;
