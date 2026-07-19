import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { appDataDir } from "../agent/paths.js";

/** Global, machine-wide settings (model default + onboarding marker). */
export interface JanetSettings {
  onboarding?: { completedAt: string; version: number };
  /** The persisted default model id, applied when no --model / JANET_MODEL is given. */
  defaultModelId?: string;
  /** Model ids the user has used directly — surfaced in the picker afterward. */
  customModels?: string[];
}

export const ONBOARDING_VERSION = 1;

function settingsPath(): string {
  return join(appDataDir(), "settings.json");
}

export function loadSettings(): JanetSettings {
  try {
    return JSON.parse(readFileSync(settingsPath(), "utf-8")) as JanetSettings;
  } catch {
    return {};
  }
}

export function saveSettings(settings: JanetSettings): void {
  const p = settingsPath();
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}

/** Persist the chosen model and mark onboarding complete. */
export function completeOnboarding(modelId: string, stampedAt: string): void {
  const settings = loadSettings();
  settings.defaultModelId = modelId;
  settings.onboarding = { completedAt: stampedAt, version: ONBOARDING_VERSION };
  saveSettings(settings);
}

export function hasOnboarded(): boolean {
  return loadSettings().onboarding !== undefined;
}

/**
 * Remember a model id the user selected directly so it appears in the picker on
 * later runs. Keeps the picker current without code changes as providers ship
 * new models. Most-recent-first, capped.
 */
export function rememberModel(modelId: string): void {
  const id = modelId.trim();
  if (!id) return;
  const settings = loadSettings();
  const rest = (settings.customModels ?? []).filter((m) => m !== id);
  settings.customModels = [id, ...rest].slice(0, 20);
  saveSettings(settings);
}
