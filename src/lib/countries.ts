export interface CountryOption {
  code: string;
  name: string;
}

/** Common ISO 3166-1 alpha-2 list for profile country picker. */
export const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "IE", name: "Ireland" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PT", name: "Portugal" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AR", name: "Argentina" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "CN", name: "China" },
  { code: "TW", name: "Taiwan" },
  { code: "HK", name: "Hong Kong" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "TH", name: "Thailand" },
  { code: "PH", name: "Philippines" },
  { code: "ID", name: "Indonesia" },
  { code: "VN", name: "Vietnam" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "TR", name: "Türkiye" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "NG", name: "Nigeria" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "IL", name: "Israel" },
].sort((left, right) => left.name.localeCompare(right.name));

const COUNTRY_BY_CODE = new Map(COUNTRIES.map((item) => [item.code, item]));

export function countryName(code: string | null | undefined): string | null {
  if (!code) {
    return null;
  }
  return COUNTRY_BY_CODE.get(code.toUpperCase())?.name ?? null;
}

/** Convert ISO alpha-2 to regional-indicator flag emoji. */
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) {
    return "";
  }
  const upper = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) {
    return "";
  }
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  );
}

export function detectCountryCode(): string | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const locales = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const locale of locales) {
    try {
      const region = new Intl.Locale(locale).maximize().region;
      if (region && COUNTRY_BY_CODE.has(region.toUpperCase())) {
        return region.toUpperCase();
      }
    } catch {
      // ignore invalid locale tags
    }
    const match = locale.match(/[-_]([A-Za-z]{2})\b/);
    if (match?.[1]) {
      const code = match[1].toUpperCase();
      if (COUNTRY_BY_CODE.has(code)) {
        return code;
      }
    }
  }

  return null;
}
