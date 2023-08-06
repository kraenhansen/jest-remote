import { PrefixingTransform } from "../PrefixingTransform";

describe("prefixingPipe", () => {
  it("prefixes a single line", () => {
    const transform = new PrefixingTransform("> ");
    transform.write("hi!");
    expect(transform.setEncoding("utf8").read()).toEqual("> hi!");
  });

  it("prefixes two lines", () => {
    const transform = new PrefixingTransform("> ");
    transform.write("hi,\nthere!");
    expect(transform.setEncoding("utf8").read()).toEqual("> hi,\n> there!");
  });

  it("an empty last line isn't prefixed", () => {
    const transform = new PrefixingTransform("> ");
    transform.write("hi,\n");
    // Notice how this doesn't end in the prefix
    expect(transform.setEncoding("utf8").read()).toEqual("> hi,\n");
  });

  it("an empty last line carries over the prefix to next", () => {
    const transform = new PrefixingTransform("> ");
    // Prime the transform with an empty last line
    transform.write("hi,\n");
    transform.read();

    transform.write("there!");
    expect(transform.setEncoding("utf8").read()).toEqual("> there!");
  });
});
