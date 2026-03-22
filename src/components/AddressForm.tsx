"use client";

export type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  province: string;
  postalCode: string;
};

const PROVINCES = [
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
];

function AddressBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Address;
  onChange: (a: Address) => void;
}) {
  const set = (field: keyof Address, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <div>
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
        {label}
      </span>
      <div className="space-y-2">
        <input
          placeholder="Full name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          className="input input-sm"
        />
        <input
          placeholder="Street address"
          value={value.line1}
          onChange={(e) => set("line1", e.target.value)}
          className="input input-sm"
        />
        <input
          placeholder="Apt, suite (optional)"
          value={value.line2}
          onChange={(e) => set("line2", e.target.value)}
          className="input input-sm"
        />
        <div className="grid grid-cols-3 gap-2">
          <input
            placeholder="City"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            className="input input-sm"
          />
          <select
            value={value.province}
            onChange={(e) => set("province", e.target.value)}
            className="input input-sm"
          >
            <option value="">Prov.</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            placeholder="Postal"
            value={value.postalCode}
            onChange={(e) => set("postalCode", e.target.value.toUpperCase())}
            maxLength={7}
            className="input input-sm"
          />
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
    <div className="grid grid-cols-2 gap-5">
      <AddressBlock label="From" value={from} onChange={onFromChange} />
      <AddressBlock label="To" value={to} onChange={onToChange} />
    </div>
  );
}
