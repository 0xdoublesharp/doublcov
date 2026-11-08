import { afterAll } from "vitest";

const pendingBodyReads: Promise<Uint8Array>[] = [];

// Happy DOM does not yet implement Response.bytes(), used by Shiki's inline
// WASM loader. Keep the real loader and highlighter in integration tests.
if (!Response.prototype.bytes) {
  Object.defineProperty(Response.prototype, "bytes", {
    configurable: true,
    writable: true,
    value: function (this: Response): Promise<Uint8Array> {
      const read = this.arrayBuffer().then((buffer) => new Uint8Array(buffer));
      pendingBodyReads.push(read);
      return read;
    },
  });
}

// Shiki starts decoding during module import, even in synchronous syntax tests.
// Finish those reads before Happy DOM tears down its pending fetch bodies.
afterAll(async () => {
  await Promise.all(pendingBodyReads);
});
