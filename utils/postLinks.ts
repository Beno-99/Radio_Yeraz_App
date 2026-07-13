import { getSafeExternalUrl } from "@/utils/media";

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");

const cleanLinks = (links: string[]) => {
  const seen = new Set<string>();

  return links
    .map((link) => link.trim())
    .filter(Boolean)
    .filter((link) => {
      if (seen.has(link)) return false;
      seen.add(link);
      return true;
    });
};

export const parsePostLinks = (value?: string | null): string[] => {
  const raw = value?.trim();
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (isStringArray(parsed)) {
      return cleanLinks(parsed);
    }
  } catch {
    // Legacy posts may still store one URL as plain text.
  }

  return cleanLinks(raw.split(/\r?\n|,/));
};

export const getSafePostLinks = (value?: string | null) =>
  parsePostLinks(value)
    .map((link) => getSafeExternalUrl(link))
    .filter((link): link is string => Boolean(link));

export const formatPostLinkLabel = (link: string) =>
  link.replace(/^https?:\/\//, "").replace(/\/$/, "");
