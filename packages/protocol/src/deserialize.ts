import { SerializedError } from "./serialize";

function isSerializedError(value: unknown): value is SerializedError {
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    return keys.length === 1 && keys[0] === "$error";
  }
  return false;
}

function reviver(this: unknown, key: string, value: unknown) {
  if (isSerializedError(value)) {
    const { $error } = value;
    const error = new Error($error.message);
    error.name = $error.name;
    error.stack = $error.stack;
    error.cause = $error.cause;
    return error;
  }
  return value;
}

export function deserialize(text: string) {
  return JSON.parse(text, reviver);
}
