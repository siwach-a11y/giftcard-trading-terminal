import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { AppConfig, AppConfigSchema } from "./config.schema";

const CONFIG_ENV_VAR = "TRADING_TERMINAL_CONFIG";
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config/default.yaml");

let cachedConfig: AppConfig | null = null;

function loadConfigFile(filePath: string): AppConfig {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = yaml.load(raw);
  return AppConfigSchema.parse(parsed);
}

/**
 * Loads and validates the operator's YAML configuration. Cached after first
 * read; call {@link reloadConfig} if the file changes while the process runs.
 */
export function getConfig(): AppConfig {
  if (!cachedConfig) {
    const configPath = process.env[CONFIG_ENV_VAR] ?? DEFAULT_CONFIG_PATH;
    cachedConfig = loadConfigFile(configPath);
  }
  return cachedConfig;
}

export function reloadConfig(): AppConfig {
  cachedConfig = null;
  return getConfig();
}
