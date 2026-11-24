import { spawn } from "node:child_process";
import { cfg } from "./config.js";

export interface RunResult { code: number | null; signal: NodeJS.Signals | null }

/**
 * Runs a command in its own process group so it can be killed with its children
 * (Gradle spawns worker JVMs). Output is streamed line by line.
 */
export function run(cmd: string, args: string[], opts: { cwd: string; onLine: (l: string) => void; shouldAbort?: () => boolean; timeoutMs?: number; env?: NodeJS.ProcessEnv }): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, env: { ...process.env, ...opts.env }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    let buf = "";
    const onData = (d: Buffer) => {
      buf += d.toString("utf8");
      const lines = buf.split(/\r?\n/);
      buf = lines.pop() ?? "";
      for (const l of lines) if (l.trim()) opts.onLine(l);
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    const kill = () => {
      try {
        process.kill(-child.pid!, "SIGTERM");
        setTimeout(() => { try { process.kill(-child.pid!, "SIGKILL"); } catch { /* gone */ } }, 5000);
      } catch { /* gone */ }
    };
    const timer = opts.timeoutMs ? setTimeout(() => { opts.onLine("⏱ Tiempo máximo de compilación superado"); kill(); }, opts.timeoutMs) : undefined;
    const abortPoll = opts.shouldAbort ? setInterval(() => { if (opts.shouldAbort!()) kill(); }, 1000) : undefined;
    child.on("error", reject);
    child.on("close", (code, signal) => {
      if (buf.trim()) opts.onLine(buf);
      clearTimeout(timer);
      clearInterval(abortPoll);
      resolve({ code, signal });
    });
  });
}

export function gradleArgs(task: string): string[] {
  return [task, "--console=plain", "--warning-mode=summary", "--stacktrace", cfg.gradleDaemon ? "--daemon" : "--no-daemon", "--max-workers=2"];
}
