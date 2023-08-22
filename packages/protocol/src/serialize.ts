// TODO: Ensure Errors in args are serialized "correctly"

export type SerializedError = {
  $error: {
    name: string;
    message: string;
    stack?: string;
    cause?: unknown;
  };
};

function replacer(this: unknown, key: string, value: unknown) {
  if (value instanceof Error) {
    return {
      $error: {
        name: value.name,
        message: value.message,
        stack: value.stack,
        cause: value.cause,
      },
    } satisfies SerializedError;
  }
  return value;
}

export function serialize(value: unknown) {
  return JSON.stringify(value, replacer);
}
