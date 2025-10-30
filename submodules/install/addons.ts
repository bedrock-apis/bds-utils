import { UnzipStreamConsumer } from "unzip-web-stream";

export class InMemoryZipStructure extends Map<string, Uint8Array> {
    private constructor() { super() }
    public static async fromStream(readable: ReadableStream<Uint8Array>): Promise<InMemoryZipStructure> {
        const inmzs = new this();
        const tasks = new Set();
        await readable.pipeTo(new UnzipStreamConsumer({
            onFile: (report, readable) => {
                const task = new Response(readable).bytes().then(_ => {
                    inmzs.set(report.path, _);
                    tasks.delete(task);
                });
                tasks.add(task);
            }
        }))
        // Just to be sure
        await Promise.all(tasks);
        return inmzs;
    }
}

/*
const data = await InMemoryZipStructure.fromStream(Readable.toWeb(createReadStream(resolve(import.meta.dirname, "../../test/behavior_pack/the.mcpack"))) as ReadableStream<Uint8Array>);
console.log(data);
console.log(new TextDecoder().decode(data.get("manifest.json")));
*/