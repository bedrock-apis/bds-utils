import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { stderr, stdout } from "node:process";

export class BedrockDedicatedServerProcess {
    public stopTimeout = 3_000; // 3s
    public readonly process: ChildProcessWithoutNullStreams;
    protected readonly promise: Promise<number | null>;
    protected _timeout_ref: ReturnType<typeof setTimeout> | null = null;
    protected _was_redirected: boolean = false;
    protected constructor(prc: ChildProcessWithoutNullStreams) {
        this.process = prc;
        const { promise, resolve } = Promise.withResolvers<number | null>();
        this.promise = promise;
        this.process.on("close", e => {
            if (this._timeout_ref !== null)
                clearTimeout(this._timeout_ref);
            this._timeout_ref = null;
            resolve(e);
        });
    }
    public static async "from"(process: ChildProcessWithoutNullStreams): Promise<BedrockDedicatedServerProcess> {
        return new BedrockDedicatedServerProcess(process);
    }
    public static async run(executable: string, args?: string[], cwd?: string): Promise<BedrockDedicatedServerProcess> {
        const process = spawn(executable, args ?? [], {
            cwd,
            env: {...globalThis.process.env, LD_LIBRARY_PATH: `${globalThis.process.env.LD_LIBRARY_PATH ?? ''}:.`},
            stdio: ["pipe"],
        });
        return this.from(process);
    }
    public enabledOutputRedirection(): void {
        if (this._was_redirected) return;
        this.process.stdout.pipe(stdout);
        this.process.stderr.pipe(stderr);
        this._was_redirected = true;
    }
    // Requests stop and waits, if force then it kill with no mercy after specified timeout.
    public stop(force: boolean, timeout: number = this.stopTimeout): Promise<number | null> {
        if (this.process.exitCode !== null)
            return this.wait();

        this.process.stdin.write("stop\n");
        if (force && this._timeout_ref === null)
            this._timeout_ref = setTimeout(() => void this.kill(), timeout ?? this.stopTimeout);
        return this.wait();
    }
    // Immediate process kill
    public kill(): Promise<number | null> {
        this.process.kill("SIGKILL");
        return this.wait();
    }
    public runCommand(cmd: string): void {
        cmd = cmd.trim();
        if (cmd.toLowerCase() === "stop") this.stop(false);
        else this.process.stdin.write(cmd + "\n");
    }
    public wait(): Promise<number | null> {
        return this.promise;
    }
}