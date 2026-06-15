import { randomUUID } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";

export type JobStatus = "running" | "cancelling" | "succeeded" | "failed" | "cancelled";

export interface JobEvent {
  sequence: number;
  stream: "stdout" | "stderr" | "system";
  data: string;
}

export interface JobView {
  id: string;
  status: JobStatus;
  createdAt: string;
  finishedAt?: string;
  exitCode?: number | null;
}

interface Job extends JobView {
  events: JobEvent[];
  subscribers: Set<(event: JobEvent) => void>;
  child: ChildProcessWithoutNullStreams;
}

export interface JobManagerOptions {
  workspace: string;
  codexCommand?: string;
  codexArgs?: string[];
  maxStoredEvents?: number;
}

export class JobManager {
  private readonly jobs = new Map<string, Job>();
  private readonly workspace: string;
  private readonly codexCommand: string;
  private readonly codexArgs: string[];
  private readonly maxStoredEvents: number;

  constructor(options: JobManagerOptions) {
    this.workspace = options.workspace;
    this.codexCommand = options.codexCommand ?? "codex";
    this.codexArgs = options.codexArgs ?? [
      "-a",
      "never",
      "exec",
      "-C",
      this.workspace,
      "-s",
      "workspace-write",
      "--json",
      "-"
    ];
    this.maxStoredEvents = options.maxStoredEvents ?? 2_000;
  }

  get activeJob(): JobView | undefined {
    const job = [...this.jobs.values()].find(
      (candidate) => candidate.status === "running" || candidate.status === "cancelling"
    );
    return job && this.toView(job);
  }

  create(prompt: string): JobView {
    if (this.activeJob) {
      throw new Error("A Codex job is already running");
    }

    const child = spawn(this.codexCommand, this.codexArgs, {
      cwd: this.workspace,
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const job: Job = {
      id: randomUUID(),
      status: "running",
      createdAt: new Date().toISOString(),
      events: [],
      subscribers: new Set(),
      child
    };
    this.jobs.set(job.id, job);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (data: string) => this.record(job, "stdout", data));
    child.stderr.on("data", (data: string) => this.record(job, "stderr", data));
    child.on("error", (error) => {
      this.record(job, "system", `Failed to start Codex: ${error.message}\n`);
      this.finish(job, "failed", null);
    });
    child.on("close", (code, signal) => {
      if (job.status !== "running" && job.status !== "cancelling") return;
      const status =
        job.status === "cancelling" || signal ? "cancelled" : code === 0 ? "succeeded" : "failed";
      this.finish(job, status, code);
    });

    child.stdin.end(prompt);
    this.record(job, "system", `Started Codex in ${this.workspace}\n`);
    return this.toView(job);
  }

  get(id: string): JobView | undefined {
    const job = this.jobs.get(id);
    return job && this.toView(job);
  }

  getEvents(id: string): JobEvent[] | undefined {
    return this.jobs.get(id)?.events;
  }

  subscribe(id: string, subscriber: (event: JobEvent) => void): (() => void) | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    job.subscribers.add(subscriber);
    return () => job.subscribers.delete(subscriber);
  }

  cancel(id: string): JobView | undefined {
    const job = this.jobs.get(id);
    if (!job) return undefined;
    if (job.status === "running") {
      job.status = "cancelling";
      this.record(job, "system", "Cancellation requested\n");
      job.child.kill("SIGTERM");
      const killTimer = setTimeout(() => {
        if (job.status === "cancelling") job.child.kill("SIGKILL");
      }, 10_000);
      killTimer.unref();
    }
    return this.toView(job);
  }

  private record(job: Job, stream: JobEvent["stream"], data: string): void {
    const event = {
      sequence: job.events.at(-1)?.sequence ? job.events.at(-1)!.sequence + 1 : 1,
      stream,
      data
    };
    job.events.push(event);
    if (job.events.length > this.maxStoredEvents) job.events.shift();
    for (const subscriber of job.subscribers) subscriber(event);
  }

  private finish(job: Job, status: JobStatus, exitCode: number | null): void {
    if (job.status !== "running" && job.status !== "cancelling") return;
    job.status = status;
    job.exitCode = exitCode;
    job.finishedAt = new Date().toISOString();
    this.record(job, "system", `Codex job ${status}${exitCode === null ? "" : ` (exit ${exitCode})`}\n`);
  }

  private toView(job: Job): JobView {
    const { id, status, createdAt, finishedAt, exitCode } = job;
    return { id, status, createdAt, finishedAt, exitCode };
  }
}
