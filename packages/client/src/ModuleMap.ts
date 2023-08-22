import type { IModuleMap, SerializableModuleMap } from "jest-haste-map";

export { SerializableModuleMap };

export class ModuleMap implements IModuleMap {
  constructor(private path: string, private json: SerializableModuleMap) {}

  getModule(
    name: string,
    platform?: string | null | undefined,
    supportsNativePlatform?: boolean | null | undefined,
    type?: (0 | 2 | 1 | 3 | 4 | 5 | "g" | "native" | "\0") | null | undefined
  ): string | null {
    console.log({ name, platform, supportsNativePlatform, type });
    if (name === "") {
      return this.path;
    } else {
      return require.resolve(name, { paths: [this.path] });
    }
  }
  getPackage(
    name: string,
    platform: string | null | undefined,
    _supportsNativePlatform: boolean | null
  ): string | null {
    throw new Error("Method not implemented.");
  }
  getMockModule(name: string): string | undefined {
    if (name === "") {
      return this.path;
    } else {
      return require.resolve(name, { paths: [this.path] });
    }
  }
  getRawModuleMap(): {
    rootDir: string;
    duplicates: Map<string, Map<string, Map<string, number>>>;
    map: Map<string, { [platform: string]: [path: string, type: number] }>;
    mocks: Map<string, string>;
  } {
    throw new Error("Method not implemented.");
  }
  toJSON(): SerializableModuleMap {
    return this.json;
  }
}
