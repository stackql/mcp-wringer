import { isAbsolute, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { WringerError } from "../core/errors.js";
import { pluginApi, WRINGER_PLUGIN_API_VERSION } from "./index.js";
import type { WringerPlugin } from "./index.js";

const loadedPlugins = new Set<string>();

export async function loadConfiguredPlugins(specifiers: readonly string[], baseDirectory: string): Promise<void> {
  for (const specifier of specifiers) {
    const moduleUrl = getPluginUrl(specifier, baseDirectory);
    if (loadedPlugins.has(moduleUrl)) {
      continue;
    }
    let loaded: unknown;
    try {
      loaded = await import(moduleUrl);
    } catch (error) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Could not load configured plugin '${specifier}': ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    const plugin = getDefaultPlugin(loaded, specifier);
    if (plugin.apiVersion !== WRINGER_PLUGIN_API_VERSION) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Plugin '${plugin.name}' requires API ${plugin.apiVersion}; this version supports ${WRINGER_PLUGIN_API_VERSION}.`,
      );
    }
    try {
      plugin.register(pluginApi);
    } catch (error) {
      throw new WringerError(
        "PLUGIN_ERROR",
        `Plugin '${plugin.name}' failed while registering: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
    loadedPlugins.add(moduleUrl);
  }
}

function getPluginUrl(specifier: string, baseDirectory: string): string {
  if (specifier.startsWith("file:")) {
    return new URL(specifier).href;
  }
  if (specifier.startsWith(".") || isAbsolute(specifier) || specifier.includes("\\")) {
    return pathToFileURL(resolve(baseDirectory, specifier)).href;
  }
  return specifier;
}

function getDefaultPlugin(value: unknown, specifier: string): WringerPlugin {
  if (!isRecord(value) || !("default" in value) || !isRecord(value.default)) {
    throw new WringerError("PLUGIN_ERROR", `Plugin '${specifier}' must provide a default plugin object.`);
  }
  const candidate = value.default;
  if (!isWringerPlugin(candidate)) {
    throw new WringerError("PLUGIN_ERROR", `Plugin '${specifier}' has an invalid default export.`);
  }
  return candidate;
}

function isWringerPlugin(value: Record<string, unknown>): value is Record<string, unknown> & WringerPlugin {
  return value.apiVersion === WRINGER_PLUGIN_API_VERSION
    && typeof value.name === "string"
    && value.name.length > 0
    && typeof value.register === "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
