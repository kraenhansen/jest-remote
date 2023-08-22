import { serialize } from "../serialize";
import { deserialize } from "../deserialize";

function testRoundtrip(value: unknown) {
  it(`serializes ${value}`, () => {
    const serialized = serialize(value);
    const deserialized = deserialize(serialized);
    expect(deserialized).toEqual(value);
  });
}

class MyError extends Error {
  name = "MyError";
}

describe("serialization", () => {
  testRoundtrip(null);
  testRoundtrip(true);
  testRoundtrip(123);
  testRoundtrip("foo");
  testRoundtrip({ foo: "bar" });
  testRoundtrip([123, true, null, "foo", { foo: "bar" }]);
  testRoundtrip(new Error("Some error"));
  testRoundtrip(new MyError("My special error"));
});
