"use client";

import { useState } from "react";

export type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
};

const PROVINCES: { code: string; name: string }[] = [
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

const POSTAL_REGEX = /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i;

export function validatePostalCode(value: string): boolean {
  if (!value) return true; // empty is valid (not filled yet)
  return POSTAL_REGEX.test(value.trim());
}

function formatPostalCode(value: string): string {
  const clean = value.replace(/\s/g, "").toUpperCase();
  if (clean.length > 3) {
    return clean.slice(0, 3) + " " + clean.slice(3, 6);
  }
  return clean;
}

function AddressBlock({
  label,
  prefix,
  value,
  onChange,
}: {
  label: string;
  prefix: string;
  value: Address;
  onChange: (a: Address) => void;
}) {
  const [postalError, setPostalError] = useState(false);

  const set = (field: keyof Address, v: string) =>
    onChange({ ...value, [field]: v });

  const handlePostalChange = (raw: string) => {
    const formatted = formatPostalCode(raw);
    set("postalCode", formatted);
    if (postalError) setPostalError(false);
  };

  const handlePostalBlur = () => {
    if (value.postalCode && !validatePostalCode(value.postalCode)) {
      setPostalError(true);
    } else {
      setPostalError(false);
    }
  };

  // Map autofill province name to our code
  const handleProvinceInput = (val: string) => {
    // If the user types or autofill provides a full name, map it
    const match = PROVINCES.find(
      (p) =>
        p.code.toLowerCase() === val.toLowerCase() ||
        p.name.toLowerCase() === val.toLowerCase()
    );
    if (match) {
      set("province", match.code);
    } else {
      set("province", val.toUpperCase().slice(0, 2));
    }
  };

  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 block">
        {label}
      </span>
      <div className="space-y-2">
        <input
          name={`${prefix}-name`}
          autoComplete="name"
          placeholder="Full name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          className="input input-sm"
        />
        <input
          name={`${prefix}-address-line1`}
          autoComplete="address-line1"
          placeholder="Street address"
          value={value.line1}
          onChange={(e) => set("line1", e.target.value)}
          className="input input-sm"
        />
        <input
          name={`${prefix}-address-line2`}
          autoComplete="address-line2"
          placeholder="Apt, suite (optional)"
          value={value.line2}
          onChange={(e) => set("line2", e.target.value)}
          className="input input-sm"
        />
        <input
          name={`${prefix}-city`}
          autoComplete="address-level2"
          placeholder="City"
          value={value.city}
          onChange={(e) => set("city", e.target.value)}
          className="input input-sm"
        />
        <div className="grid grid-cols-2 gap-2">
          {/* Province: hidden input for autofill, visible select for manual */}
          <div className="relative">
            <input
              name={`${prefix}-province`}
              autoComplete="address-level1"
              value={
                PROVINCES.find((p) => p.code === value.province)?.name ||
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
              <option value="">Province</option>
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <input
              name={`${prefix}-postal-code`}
              autoComplete="postal-code"
              placeholder="A1A 1A1"
              value={value.postalCode}
              onChange={(e) => handlePostalChange(e.target.value)}
              onBlur={handlePostalBlur}
              maxLength={7}
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
      </div>
    </div>
  );
}

export function AddressSection({
  from,
  to,
  onFromChange,
  onToChange,
}: {
  from: Address;
  to: Address;
  onFromChange: (a: Address) => void;
  onToChange: (a: Address) => void;
}) {
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      <AddressBlock
        label="Return address"
        prefix="from"
        value={from}
        onChange={onFromChange}
      />
      <AddressBlock
        label="Mailing to"
        prefix="to"
        value={to}
        onChange={onToChange}
      />
    </div>
  );
}
