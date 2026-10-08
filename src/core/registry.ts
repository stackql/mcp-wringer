import { RegistryError } from "./errors.js";

export class ExtensionRegistry<T> {
  readonly #entries = new Map<string, T>();

  register(name: string, extension: T): void {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      throw new RegistryError(`Invalid extension name '${name}'. Names must be lowercase kebab-case.`);
    }
    if (this.#entries.has(name)) {
      throw new RegistryError(`Extension '${name}' is already registered.`);
    }
    this.#entries.set(name, extension);
  }

  get(name: string): T {
    const extension = this.#entries.get(name);
    if (extension === undefined) {
      throw new RegistryError(`Unknown extension '${name}'. Available: ${this.names().join(", ")}.`);
    }
    return extension;
  }

  names(): string[] {
    return [...this.#entries.keys()].sort();
  }
}
