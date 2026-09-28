import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Category {
  id: string;
  name: string;
  description: string;
  aliases: string[];
}

interface CategoryConfig {
  categories: Category[];
}

let cachedConfig: CategoryConfig | null = null;

export function loadCategories(): CategoryConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const configPath = path.join(__dirname, "../../config/categories.json");
  const configData = fs.readFileSync(configPath, "utf-8");
  cachedConfig = JSON.parse(configData);
  return cachedConfig!;
}

export function getCategories(): Category[] {
  const config = loadCategories();
  return config.categories;
}

export function getCategoryNames(): string[] {
  const categories = getCategories();
  return categories.map((c) => c.name);
}

export function normalizeCategory(input: string): string {
  const categories = getCategories();
  const trimmed = input.trim().toLowerCase();

  for (const category of categories) {
    if (category.aliases.some((alias) => alias.toLowerCase() === trimmed)) {
      return category.name;
    }
  }

  // If no match, return title-cased version
  return input
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function reloadCategories(): void {
  cachedConfig = null;
  loadCategories();
}
