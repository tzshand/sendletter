"use client";

import { useState } from "react";

export type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
};

const CA_PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" }, { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" }, { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" }, { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" }, { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" }, { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" }, { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" }, { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" }, { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

// Common countries at top, then alphabetical rest
const COUNTRIES: { code: string; name: string }[] = [
  { code: "CA", name: "Canada" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "FR", name: "France" },
  { code: "DE", name: "Germany" },
  { code: "AU", name: "Australia" },
  { code: "---", name: "───────────────" },
  { code: "AF", name: "Afghanistan" }, { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" }, { code: "AR", name: "Argentina" },
  { code: "AT", name: "Austria" }, { code: "BD", name: "Bangladesh" },
  { code: "BE", name: "Belgium" }, { code: "BR", name: "Brazil" },
  { code: "BG", name: "Bulgaria" }, { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" }, { code: "CL", name: "Chile" },
  { code: "CN", name: "China" }, { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" }, { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" }, { code: "CZ", name: "Czech Republic" },
  { code: "DK", name: "Denmark" }, { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" }, { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" }, { code: "EE", name: "Estonia" },
  { code: "ET", name: "Ethiopia" }, { code: "FI", name: "Finland" },
  { code: "GH", name: "Ghana" }, { code: "GR", name: "Greece" },
  { code: "GT", name: "Guatemala" }, { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" }, { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" }, { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" }, { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" }, { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" }, { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" }, { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" }, { code: "JO", name: "Jordan" },
  { code: "KE", name: "Kenya" }, { code: "KR", name: "South Korea" },
  { code: "KW", name: "Kuwait" }, { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" }, { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" }, { code: "MY", name: "Malaysia" },
  { code: "MX", name: "Mexico" }, { code: "MA", name: "Morocco" },
  { code: "NL", name: "Netherlands" }, { code: "NZ", name: "New Zealand" },
  { code: "NG", name: "Nigeria" }, { code: "NO", name: "Norway" },
  { code: "PK", name: "Pakistan" }, { code: "PA", name: "Panama" },
  { code: "PY", name: "Paraguay" }, { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" }, { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" }, { code: "QA", name: "Qatar" },
  { code: "RO", name: "Romania" }, { code: "RU", name: "Russia" },
  { code: "SA", name: "Saudi Arabia" }, { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" }, { code: "SG", name: "Singapore" },
  { code: "SK", name: "Slovakia" }, { code: "SI", name: "Slovenia" },
  { code: "ZA", name: "South Africa" }, { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" }, { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" }, { code: "TW", name: "Taiwan" },
  { code: "TH", name: "Thailand" }, { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" }, { code: "TR", name: "Turkey" },
  { code: "UA", name: "Ukraine" }, { code: "AE", name: "United Arab Emirates" },
  { code: "UY", name: "Uruguay" }, { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
];

const CA_POSTAL_REGEX = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;

export function validatePostalCode(value: string, country: string): boolean {
  if (!value) return true;
  if (country === "CA") return CA_POSTAL_REGEX.test(value.trim());
  return true; // no validation for other countries
}

function formatPostalCode(value: string, country: string): string {
  if (country !== "CA") return value;
  const clean = value.replace(/\s/g, "").toUpperCase();
  if (clean.length > 3) {
    return clean.slice(0, 3) + " " + clean.slice(3, 6);
  }
  return clean;
}

function getRegions(country: string): { code: string; name: string }[] | null {
  if (country === "CA") return CA_PROVINCES;
  if (country === "US") return US_STATES;
  return null;
}

function getRegionLabel(country: string, language: string): string {
  if (country === "CA") return language === "fr" ? "Province" : "Province";
  if (country === "US") return "State";
  return language === "fr" ? "Région" : "Region";
}

function getPostalLabel(country: string, language: string): string {
  if (country === "CA") return language === "fr" ? "Code postal" : "Postal code";
  if (country === "US") return "ZIP code";
  return language === "fr" ? "Code postal" : "Postal code";
}

function getPostalPlaceholder(country: string): string {
  if (country === "CA") return "A1A 1A1";
  if (country === "US") return "12345";
  return "";
}

function AddressBlock({
  label,
  prefix,
  value,
  onChange,
  hasError,
  language = "en",
  lockCountry,
}: {
  label: string;
  prefix: string;
  value: Address;
  onChange: (a: Address) => void;
  hasError?: boolean;
  language?: "en" | "fr";
  lockCountry?: string;
}) {
  const [postalError, setPostalError] = useState(false);
  const country = value.country || "CA";
  const regions = getRegions(country);

  const set = (field: keyof Address, v: string) =>
    onChange({ ...value, [field]: v });

  const handleCountryChange = (code: string) => {
    if (code === "---") return;
    // Reset province/postal when country changes
    onChange({ ...value, country: code, province: "", postalCode: "" });
    setPostalError(false);
  };

  const handlePostalChange = (raw: string) => {
    const formatted = formatPostalCode(raw, country);
    set("postalCode", formatted);
    if (postalError) setPostalError(false);
  };

  const handlePostalBlur = () => {
    if (value.postalCode && !validatePostalCode(value.postalCode, country)) {
      setPostalError(true);
    } else {
      setPostalError(false);
    }
  };

  // Map autofill province name to code (for CA/US)
  const handleProvinceInput = (val: string) => {
    if (!regions) {
      set("province", val);
      return;
    }
    const match = regions.find(
      (p) =>
        p.code.toLowerCase() === val.toLowerCase() ||
        p.name.toLowerCase() === val.toLowerCase()
    );
    if (match) {
      set("province", match.code);
    } else {
      set("province", val);
    }
  };

  const isFr = language === "fr";

  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 block">
        {label}
      </span>
      <div className={`space-y-2 rounded-xl p-3 -m-3 transition-all ${hasError ? "ring-2 ring-red-400 bg-red-50/40" : ""}`}>
        <input
          name={`${prefix}-name`}
          autoComplete="name"
          placeholder={isFr ? "Nom complet" : "Full name"}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          className="input input-sm"
        />
        <input
          name={`${prefix}-address-line1`}
          autoComplete="address-line1"
          placeholder={isFr ? "Adresse" : "Street address"}
          value={value.line1}
          onChange={(e) => set("line1", e.target.value)}
          className="input input-sm"
        />
        <input
          name={`${prefix}-address-line2`}
          autoComplete="address-line2"
          placeholder={isFr ? "App., bureau (facultatif)" : "Apt, suite (optional)"}
          value={value.line2}
          onChange={(e) => set("line2", e.target.value)}
          className="input input-sm"
        />
        <input
          name={`${prefix}-city`}
          autoComplete="address-level2"
          placeholder={isFr ? "Ville" : "City"}
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          className="input input-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          {regions ? (
            <div className="relative">
              <input
                name={`${prefix}-province`}
                autoComplete="address-level1"
                value={
                  regions.find((p) => p.code === value.province)?.name ||
                  value.province
                }
                onChange={(e) => handleProvinceInput(e.target.value)}
                className="absolute inset-0 opacity-0 pointer-events-none"
                tabIndex={-1}
                aria-hidden
              />
              <select
                value={value.province}
                onChange={(e) => set("province", e.target.value)}
                className="input input-sm w-full"
              >
                <option value="">{getRegionLabel(country, language)}</option>
                {regions.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <input
              name={`${prefix}-province`}
              autoComplete="address-level1"
              placeholder={getRegionLabel(country, language)}
              value={value.province}
              onChange={(e) => set("province", e.target.value)}
              className="input input-sm"
            />
          )}
          <div>
            <input
              name={`${prefix}-postal-code`}
              autoComplete="postal-code"
              placeholder={getPostalPlaceholder(country) || getPostalLabel(country, language)}
              value={value.postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              onBlur={handlePostalBlur}
              maxLength={country === "CA" ? 7 : 20}
              className={`input input-sm ${
                postalError
                  ? "!border-red-400 !shadow-[0_0_0_3px_rgba(239,68,68,0.08)]"
                  : ""
              }`}
            />
            {postalError && (
              <p className="text-[11px] text-red-500 mt-1">
                Format: A1A 1A1
              </p>
            )}
          </div>
        </div>
        {/* Country selector */}
        {lockCountry ? (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>🇨🇦</span>
            <span>Canada</span>
          </div>
        ) : (
          <select
            name={`${prefix}-country`}
            autoComplete="country"
            value={country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="input input-sm w-full"
          >
            {COUNTRIES.map((c) =>
              c.code === "---" ? (
                <option key="sep" disabled>
                  {c.name}
                </option>
              ) : (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              )
            )}
          </select>
        )}
      </div>
    </div>
  );
}

export function AddressSection({
  from,
  to,
  onFromChange,
  onToChange,
  errors,
  language = "en",
}: {
  from: Address;
  to: Address;
  onFromChange: (a: Address) => void;
  onToChange: (a: Address) => void;
  errors?: { from?: boolean; to?: boolean };
  language?: "en" | "fr";
}) {
  const isFr = language === "fr";
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <AddressBlock
        label={isFr ? "De \u2013 Adresse de retour" : "From \u2013 Return Address"}
        prefix="from"
        value={from}
        onChange={onFromChange}
        hasError={errors?.from}
        language={language}
      />
      <AddressBlock
        label={isFr ? "\u00C0 \u2013 Adresse postale" : "To \u2013 Mailing Address"}
        prefix="to"
        value={to}
        onChange={onToChange}
        hasError={errors?.to}
        language={language}
        lockCountry="CA"
      />
    </div>
  );
}
