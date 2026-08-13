import { spawn } from "node:child_process";
import process from "node:process";

import { redactText } from "./json.js";

export type CommandSpec = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
  timeoutMs: number;
  maxStdoutBytes: number;
  maxStderrBytes: number;
  acceptedExitCodes: readonly number[];
  redactions: readonly string[];
  env: NodeJS.ProcessEnv;
}>;

export type CommandResult = Readonly<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export interface CommandRunner {
  run(spec: CommandSpec): Promise<CommandResult>;
}

export class BoundedCommandRunner implements CommandRunner {
  async run(spec: CommandSpec): Promise<CommandResult> {
    return await new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(spec.command, [...spec.args], {
        cwd: spec.cwd,
        env: spec.env,
        shell: false,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let stdoutBytes = 0;
      let stderrBytes = 0;
      let terminalError: Error | null = null;
      let timedOut = false;

      const terminate = (error: Error): void => {
        if (terminalError) return;
        terminalError = error;
        child.kill("SIGKILL");
      };

      const timer = setTimeout(() => {
        timedOut = true;
        terminate(
          new Error(`subprocess timed out after ${spec.timeoutMs}ms`),
        );
      }, spec.timeoutMs);

      child.stdout.on("data", (chunk: Buffer) => {
        if (terminalError) return;
        const nextBytes = stdoutBytes + chunk.byteLength;
        if (nextBytes > spec.maxStdoutBytes) {
          terminate(
            new Error(
              `subprocess stdout exceeded ${spec.maxStdoutBytes} bytes`,
            ),
          );
          return;
        }
        stdout.push(Buffer.from(chunk));
        stdoutBytes = nextBytes;
      });
      child.stderr.on("data", (chunk: Buffer) => {
        if (terminalError) return;
        const nextBytes = stderrBytes + chunk.byteLength;
        if (nextBytes > spec.maxStderrBytes) {
          terminate(
            new Error(
              `subprocess stderr exceeded ${spec.maxStderrBytes} bytes`,
            ),
          );
          return;
        }
        stderr.push(Buffer.from(chunk));
        stderrBytes = nextBytes;
      });
      child.on("error", (error) => {
        terminate(error);
      });
      child.on("close", (code, signal) => {
        clearTimeout(timer);
        const stdoutText = redactText(
          Buffer.concat(stdout).toString("utf8"),
          spec.redactions,
        );
        const stderrText = redactText(
          Buffer.concat(stderr).toString("utf8"),
          spec.redactions,
        );
        if (terminalError) {
          reject(
            new Error(
              `${terminalError.message}${
                stderrText.trim()
                  ? `: ${stderrText.trim().slice(0, 2048)}`
                  : ""
              }`,
            ),
          );
          return;
        }
        if (timedOut) {
          reject(new Error("subprocess timed out"));
          return;
        }
        if (code === null) {
          reject(
            new Error(
              `subprocess ended by signal ${signal ?? "unknown"}`,
            ),
          );
          return;
        }
        if (!spec.acceptedExitCodes.includes(code)) {
          const detail = stderrText.trim() || stdoutText.trim();
          reject(
            new Error(
              `subprocess exited ${code}${
                detail ? `: ${detail.slice(0, 2048)}` : ""
              }`,
            ),
          );
          return;
        }
        resolve({
          exitCode: code,
          stdout: stdoutText,
          stderr: stderrText,
        });
      });
    });
  }
}

export function cleanChildEnvironment(): NodeJS.ProcessEnv {
  const output: NodeJS.ProcessEnv = { ...process.env };
  delete output.VOID_MCP_TOKEN_FILE;
  delete output.VOID_MCP_ALLOW_SUBMIT;
  return output;
}
