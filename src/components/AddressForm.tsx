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
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
];

function AddressFields({
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
    <fieldset className="bg-white rounded-xl border border-gray-200 p-6">
      <legend className="text-sm font-semibold text-gray-700 px-1">
        {label}
      </legend>
      <div className="space-y-3 mt-2">
        <input
          placeholder="Full name"
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        <input
          placeholder="Address line 1"
          value={value.line1}
          onChange={(e) => set("line1", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        <input
          placeholder="Address line 2 (optional)"
          value={value.line2}
          onChange={(e) => set("line2", e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
        />
        <div className="grid grid-cols-3 gap-3">
          <input
            placeholder="City"
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
          <select
            value={value.province}
            onChange={(e) => set("province", e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          >
            <option value="">Province</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            placeholder="Postal code"
            value={value.postalCode}
            onChange={(e) => set("postalCode", e.target.value.toUpperCase())}
            maxLength={7}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
          />
        </div>
      </div>
    </fieldset>
  );
}

export function AddressForm({
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
    <div>
      <h2 className="text-lg font-semibold mb-1">Mailing Addresses</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter the sender and recipient addresses. Both must be in Canada.
      </p>
      <div className="grid md:grid-cols-2 gap-6">
        <AddressFields label="From (sender)" value={from} onChange={onFromChange} />
        <AddressFields label="To (recipient)" value={to} onChange={onToChange} />
      </div>
    </div>
  );
}
