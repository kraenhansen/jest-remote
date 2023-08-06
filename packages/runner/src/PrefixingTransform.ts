import { Transform } from "node:stream";

/**
 * Will prefix before writing to any new line.
 */
export class PrefixingTransform extends Transform {
  private newLine = true;

  constructor(prefix: string) {
    super({
      transform: (chunk: unknown, encoding, callback) => {
        if (chunk instanceof Buffer) {
          const text = chunk.toLocaleString();
          // Prefix any new lines in the text
          const lines = text.split("\n");
          const prefixedLines = lines
            .map((line, index) => {
              if (index === 0 && this.newLine) {
                // The first line and we have a prefix carry over
                this.newLine = false;
                return prefix + line;
              } else if (index === lines.length - 1 && line.length === 0) {
                // The last line and it's empty, we'll let the prefix carry over
                this.newLine = true;
                return line;
              } else {
                return prefix + line;
              }
            })
            .join("\n");
          this.push(prefixedLines);
          callback();
        } else {
          throw new Error("Expected chunk to be an instance of Buffer");
        }
      },
    });
  }
}
