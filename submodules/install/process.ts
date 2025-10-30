import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { stderr, stdout } from "node:process";

export class BedrockDedicatedServerProcess {
    public stopTimeout = 3_000; // 3s
    public readonly process: ChildProcessWithoutNullStreams;
    protected readonly promise: Promise<number | null>;
    protected timeoutRef: ReturnType<typeof setTimeout> | null = null;
    protected constructor(prc: ChildProcessWithoutNullStreams) {
        this.process = prc;
        const { promise, resolve } = Promise.withResolvers<number | null>();
        this.promise = promise;
        this.process.on("exit", e => {
            if (this.timeoutRef !== null)
                clearTimeout(this.timeoutRef);
            this.timeoutRef = null;
            resolve(e);
        });
    }
    public static async "from"(process: ChildProcessWithoutNullStreams): Promise<BedrockDedicatedServerProcess> {
        return new BedrockDedicatedServerProcess(process);
    }
    public enabledOutputRedirection(): void {
        this.process.stdout.pipe(stdout);
        this.process.stderr.pipe(stderr);
    }
    public stop(force: boolean): Promise<number | null> {
        if (this.process.exitCode !== null)
            return this.getAwaiter();

        this.process.stdin.write("stop\n");
        if (force && this.timeoutRef === null)
            this.timeoutRef = setTimeout(() => this.process.kill("SIGKILL"), this.stopTimeout);
        return this.getAwaiter();
    }
    public runCommand(cmd: string): void{
        cmd = cmd.trim();
        if(cmd.toLowerCase() === "stop") this.stop(false);
        else this.process.stdin.write(cmd + "\n");
    }
    public getAwaiter(): Promise<number | null> {
        return this.promise;
    }
}