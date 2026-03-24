#!/usr/bin/env node
/**
 * Full-pass API test suite for sendletter /api/v1/send
 *
 * Generates a temporary API key, runs tests against production,
 * then cleans up. Tests escape characters, injection, all modes,
 * and error handling.
 */

import { createHash, randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = process.env.API_BASE || "https://sendletter.app";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  console.error("Run with: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node test-api.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Key management ---
function generateApiKey() {
  const bytes = randomBytes(32);
  const raw = `sl_live_${bytes.toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  const prefix = raw.slice(0, 16) + "...";
  return { raw, hash, prefix };
}

let testKeyId = null;
let testAccountId = null;
let testApiKey = null;
let createdOrderIds = [];

async function setup() {
  // Find the account (should be only one with has_payment_method)
  const { data: accounts, error } = await supabase
    .from("sendletter_accounts")
    .select("id, email, has_payment_method")
    .eq("has_payment_method", true)
    .limit(1);

  if (error || !accounts?.length) {
    console.error("No account with payment method found:", error);
    process.exit(1);
  }

  testAccountId = accounts[0].id;
  console.log(`Using account: ${accounts[0].email} (${testAccountId})`);

  // Generate and insert a temporary API key
  const key = generateApiKey();
  testApiKey = key.raw;

  const { data: keyRow, error: keyErr } = await supabase
    .from("sendletter_api_keys")
    .insert({
      account_id: testAccountId,
      key_hash: key.hash,
      key_prefix: key.prefix,
      is_active: true,
    })
    .select("id")
    .single();

  if (keyErr) {
    console.error("Failed to insert test API key:", keyErr);
    process.exit(1);
  }

  testKeyId = keyRow.id;
  console.log(`Created test API key: ${key.prefix}`);
}

async function cleanup() {
  console.log("\n--- Cleanup ---");

  // Deactivate test key
  if (testKeyId) {
    await supabase
      .from("sendletter_api_keys")
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq("id", testKeyId);
    console.log("Deactivated test API key");
  }

  // Delete test orders and usage records
  for (const orderId of createdOrderIds) {
    await supabase.from("sendletter_api_usage").delete().eq("order_id", orderId);
    await supabase.from("sendletter_orders").delete().eq("id", orderId);
  }
  if (createdOrderIds.length) {
    console.log(`Cleaned up ${createdOrderIds.length} test orders`);
  }

  // Delete the test key row entirely
  if (testKeyId) {
    await supabase.from("sendletter_api_keys").delete().eq("id", testKeyId);
    console.log("Deleted test API key row");
  }
}

// --- HTTP helper ---
async function apiCall(body, { key = testApiKey, expectStatus = 200, label = "" } = {}) {
  const res = await fetch(`${API_BASE}/api/v1/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  const pass = res.status === expectStatus;

  if (json.id) createdOrderIds.push(json.id);

  const icon = pass ? "✅" : "❌";
  console.log(`${icon} [${res.status}] ${label}`);
  if (!pass) {
    console.log(`   Expected ${expectStatus}, got ${res.status}`);
    console.log(`   Response:`, JSON.stringify(json));
  }
  return { status: res.status, json, pass };
}

async function rawApiCall(rawBody, { key = testApiKey, expectStatus = 400, label = "" } = {}) {
  const res = await fetch(`${API_BASE}/api/v1/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
    body: rawBody,
  });

  const json = await res.json();
  const pass = res.status === expectStatus;

  const icon = pass ? "✅" : "❌";
  console.log(`${icon} [${res.status}] ${label}`);
  if (!pass) {
    console.log(`   Expected ${expectStatus}, got ${res.status}`);
    console.log(`   Response:`, JSON.stringify(json));
  }
  return { status: res.status, json, pass };
}

// --- Standard addresses ---
const FROM_CA = {
  name: "Test Sender",
  line1: "100 Wellington St",
  city: "Ottawa",
  province: "ON",
  postal_code: "K1A 0A6",
  country: "CA",
};

const TO_CA = {
  name: "Test Recipient",
  line1: "1 Blue Jays Way",
  city: "Toronto",
  province: "ON",
  postal_code: "M5V 1J1",
  country: "CA",
};

// ====================== TEST SUITES ======================

async function testAuth() {
  console.log("\n=== AUTH TESTS ===");

  // No auth header
  await apiCall({ mode: "draft", from: FROM_CA, to: TO_CA, letter: { body: "test" } }, {
    key: null, expectStatus: 401, label: "No auth header → 401"
  });

  // Invalid key
  await apiCall({ mode: "draft", from: FROM_CA, to: TO_CA, letter: { body: "test" } }, {
    key: "sl_live_000000000000000000000000000000000000000000000000", expectStatus: 401, label: "Invalid API key → 401"
  });

  // Malformed key (no sl_live_ prefix)
  await apiCall({ mode: "draft", from: FROM_CA, to: TO_CA, letter: { body: "test" } }, {
    key: "bad_key_format", expectStatus: 401, label: "Malformed key (no prefix) → 401"
  });
}

async function testJsonParsing() {
  console.log("\n=== JSON PARSING & ESCAPE TESTS ===");

  // Completely invalid JSON
  await rawApiCall('this is not json', {
    expectStatus: 400, label: "Invalid JSON string → 400 with helpful message"
  });

  // Unescaped quotes in JSON
  await rawApiCall('{"mode": "draft", "name": "John "Smith"}', {
    expectStatus: 400, label: "Unescaped double quotes → 400"
  });

  // Truncated JSON
  await rawApiCall('{"mode": "dra', {
    expectStatus: 400, label: "Truncated JSON → 400"
  });

  // JSON array instead of object
  await rawApiCall('[1, 2, 3]', {
    expectStatus: 400, label: "JSON array instead of object → 400"
  });

  // Empty body
  await rawApiCall('', {
    expectStatus: 400, label: "Empty body → 400"
  });
}

async function testDraftMode() {
  console.log("\n=== DRAFT MODE TESTS ===");

  // Basic valid draft
  const r1 = await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: {
      date: "2026-03-23",
      salutation: "Dear Test,",
      body: "This is a basic draft mode test.",
      closing: "Regards,",
      signature: "Test Bot",
    }
  }, { label: "Basic draft → 200" });
  if (r1.pass) console.log(`   Order ID: ${r1.json.id}, Amount: ${r1.json.amount_cents}c`);

  // Draft with special characters in body (quotes, angle brackets, ampersands)
  const r2 = await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: 'John "The Man" O\'Brien & Sons' },
    to: { ...TO_CA, name: "Recipient <Important>" },
    letter: {
      body: 'This letter contains "double quotes", \'single quotes\', <angle brackets>, &ampersands&, and a backslash \\path\\to\\file.',
      subject: 'Re: Invoice #123 — "Urgent" <action required>',
      salutation: "Dear \"Friend\",",
      closing: "Yours & truly,",
      signature: 'Bob "Bobby" Smith',
      ps: "P.S. Check <https://example.com> & reply ASAP!",
    }
  }, { label: "Draft with special chars (\", <, >, &, \\) → 200" });
  if (r2.pass) console.log(`   Order ID: ${r2.json.id}`);

  // Draft with unicode and accented characters
  const r3 = await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: "François Müller-Østergård", line1: "123 Rue Château-d'Eau" },
    to: { ...TO_CA, name: "田中太郎 (Tanaka Tarō)" },
    letter: {
      body: "Cher client,\n\nVeuillez trouver ci-joint votre relevé.\n\nCordialement,\nFrançois",
      salutation: "Cher(e) client(e),",
    }
  }, { label: "Draft with unicode/accented chars → 200" });
  if (r3.pass) console.log(`   Order ID: ${r3.json.id}`);

  // Draft with newlines and whitespace preservation
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: {
      body: "Line 1\nLine 2\n\n  Indented line\n\tTabbed line\n\nParagraph break above.",
    }
  }, { label: "Draft with newlines/tabs/indentation → 200" });

  // Draft with HTML injection attempt in body
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: {
      body: '<script>alert("xss")</script><img src=x onerror=alert(1)>',
      subject: '</strong><script>alert("subject xss")</script>',
      salutation: '<div style="position:absolute;top:0;left:0;width:100%;height:100%;background:red;">INJECTED</div>',
    }
  }, { label: "Draft with HTML injection attempts → 200 (should be escaped)" });

  // Missing letter.body
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: { date: "2026-01-01" }
  }, { expectStatus: 400, label: "Draft missing body → 400" });

  // letter.body is not a string
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: 12345 }
  }, { expectStatus: 400, label: "Draft body is number → 400" });

  // letter field is not a string
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "test", subject: ["array", "value"] }
  }, { expectStatus: 400, label: "Draft subject is array → 400" });
}

async function testFormattedMode() {
  console.log("\n=== FORMATTED MODE TESTS ===");

  // Basic valid formatted
  const r1 = await apiCall({
    mode: "formatted",
    from: FROM_CA,
    to: TO_CA,
    html: "<h1>Test Letter</h1><p>This is a formatted letter via API test.</p>",
  }, { label: "Basic formatted HTML → 200" });
  if (r1.pass) console.log(`   Order ID: ${r1.json.id}`);

  // Formatted with CSS
  await apiCall({
    mode: "formatted",
    from: FROM_CA,
    to: TO_CA,
    html: "<h1>Styled Letter</h1><p>Custom CSS test.</p>",
    css: "h1 { color: navy; border-bottom: 2px solid #ccc; } p { font-size: 14pt; }",
    font: "Georgia",
    font_size: 14,
  }, { label: "Formatted with CSS + font options → 200" });

  // CSS injection attempt (</style> breakout)
  await apiCall({
    mode: "formatted",
    from: FROM_CA,
    to: TO_CA,
    html: "<p>Test</p>",
    css: '</style><script>alert("css breakout")</script><style>',
  }, { label: "CSS </style> breakout attempt → 200 (should be sanitized)" });

  // Missing html field
  await apiCall({
    mode: "formatted",
    from: FROM_CA,
    to: TO_CA,
  }, { expectStatus: 400, label: "Formatted missing html → 400" });

  // Invalid font
  await apiCall({
    mode: "formatted",
    from: FROM_CA,
    to: TO_CA,
    html: "<p>Test</p>",
    font: "Comic Sans MS",
  }, { expectStatus: 400, label: "Invalid font name → 400" });

  // Font size out of range
  await apiCall({
    mode: "formatted",
    from: FROM_CA,
    to: TO_CA,
    html: "<p>Test</p>",
    font_size: 72,
  }, { expectStatus: 400, label: "Font size too large → 400" });
}

async function testUploadMode() {
  console.log("\n=== UPLOAD MODE TESTS ===");

  // Minimal valid upload (tiny fake base64 — will create order even though PDF is invalid)
  const fakePdf = Buffer.from("%PDF-1.4 fake").toString("base64");
  const r1 = await apiCall({
    mode: "upload",
    from: FROM_CA,
    to: TO_CA,
    file: fakePdf,
    file_type: "pdf",
    page_count: 1,
  }, { label: "Upload mode with fake PDF → 200" });
  if (r1.pass) console.log(`   Order ID: ${r1.json.id}`);

  // Missing file
  await apiCall({
    mode: "upload",
    from: FROM_CA,
    to: TO_CA,
    file_type: "pdf",
  }, { expectStatus: 400, label: "Upload missing file → 400" });

  // Invalid file_type
  await apiCall({
    mode: "upload",
    from: FROM_CA,
    to: TO_CA,
    file: fakePdf,
    file_type: "png",
  }, { expectStatus: 400, label: "Invalid file_type → 400" });
}

async function testAddressValidation() {
  console.log("\n=== ADDRESS VALIDATION TESTS ===");

  // To address not Canada
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: { ...TO_CA, country: "US", province: "NY", postal_code: "10001" },
    letter: { body: "test" }
  }, { expectStatus: 400, label: "To address US → 400 (Canada only)" });

  // From address international (should work)
  await apiCall({
    mode: "draft",
    from: { name: "International Sender", line1: "10 Downing St", city: "London", country: "GB" },
    to: TO_CA,
    letter: { body: "Letter from UK to Canada." }
  }, { label: "From address UK → 200 (international return OK)" });

  // Missing from.name
  await apiCall({
    mode: "draft",
    from: { line1: "123 St", city: "Ottawa", province: "ON", postal_code: "K1A 0A6" },
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: "Missing from.name → 400" });

  // Invalid Canadian postal code
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, postal_code: "ZZZZZ" },
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: "Invalid CA postal code → 400" });

  // Valid FSA only (3-char)
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, postal_code: "K1A" },
    to: TO_CA,
    letter: { body: "test with FSA-only postal" }
  }, { label: "FSA-only postal code (K1A) → 200" });

  // Invalid country code (3 letters)
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, country: "CAN" },
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: "3-letter country code → 400" });

  // Address with special chars in name (quotes, etc.)
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: 'O\'Malley & Associates "LLC"', line1: "Unit #5, 100 Rue d'Avignon", line2: "c/o François <Dept>" },
    to: { ...TO_CA, name: 'Smith & Wesson "Attorneys"' },
    letter: { body: "Testing special chars in addresses." }
  }, { label: "Addresses with quotes, &, <, > → 200" });

  // Extremely long field
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: "A".repeat(201) },
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: "Address name >200 chars → 400" });
}

async function testModeValidation() {
  console.log("\n=== MODE & SIZE VALIDATION ===");

  // Missing mode
  await apiCall({
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: "Missing mode → 400" });

  // Invalid mode
  await apiCall({
    mode: "express",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: 'Invalid mode "express" → 400' });

  // Invalid letter_size
  await apiCall({
    mode: "draft",
    letter_size: "huge",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "test" }
  }, { expectStatus: 400, label: 'Invalid letter_size "huge" → 400' });

  // Valid large size
  await apiCall({
    mode: "draft",
    letter_size: "large",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "Testing large letter size." }
  }, { label: "Large letter size → 200 ($9.28)" });

  // Valid legal size
  await apiCall({
    mode: "draft",
    letter_size: "legal",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "Testing legal letter size." }
  }, { label: "Legal letter size → 200 ($9.28)" });
}

async function testEscapeEdgeCases() {
  console.log("\n=== ESCAPE CHARACTER EDGE CASES ===");

  // Null bytes in strings
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: "Test\x00Null\x00Bytes" },
    to: TO_CA,
    letter: { body: "Body with \x00null\x00 bytes embedded." }
  }, { label: "Null bytes in fields → 200 (should be stripped)" });

  // Zero-width characters
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: "Test\u200B\u200C\u200DInvisible" },
    to: TO_CA,
    letter: { body: "Body with \uFEFF BOM and \u200B zero-width spaces." }
  }, { label: "Zero-width/BOM chars → 200 (should be stripped)" });

  // Control characters
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: { body: "Line with \x01 \x02 \x1F control chars." }
  }, { label: "ASCII control chars → 200 (should be stripped)" });

  // Backslash sequences that survived JSON parsing
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: {
      body: "Paths like C:\\Users\\test\\file.txt and quotes like \"hello\" are OK.",
      subject: "Re: File at C:\\Windows\\System32",
    }
  }, { label: "Backslashes and escaped quotes in content → 200" });

  // Deeply nested HTML injection
  await apiCall({
    mode: "draft",
    from: FROM_CA,
    to: TO_CA,
    letter: {
      body: '"><img src=x onerror=alert(1)><"',
      closing: "Regards,\"><script>alert(1)</script>",
      cc: "admin@evil.com\"><img src=x>",
    }
  }, { label: "HTML injection via attribute breakout → 200 (should be escaped)" });

  // SQL injection attempt (should be safe via parameterized queries)
  await apiCall({
    mode: "draft",
    from: { ...FROM_CA, name: "Robert'); DROP TABLE sendletter_orders;--" },
    to: TO_CA,
    letter: { body: "Testing SQL injection safety." }
  }, { label: "SQL injection in address → 200 (parameterized)" });
}

// ====================== VERIFY OUTPUT ======================

async function verifyOrders() {
  console.log("\n=== VERIFYING DATABASE OUTPUT ===");

  if (!createdOrderIds.length) {
    console.log("No orders to verify.");
    return;
  }

  for (const orderId of createdOrderIds) {
    const { data: order } = await supabase
      .from("sendletter_orders")
      .select("id, from_name, to_name, letter_mode, letter_size, letter_html, amount_cents")
      .eq("id", orderId)
      .single();

    if (!order) {
      console.log(`❌ Order ${orderId} not found in database`);
      continue;
    }

    console.log(`\n📋 Order ${order.id.slice(0, 8)}...`);
    console.log(`   Mode: ${order.letter_mode}, Size: ${order.letter_size}, Amount: ${order.amount_cents}c`);
    console.log(`   From: ${order.from_name}`);
    console.log(`   To: ${order.to_name}`);

    // Check HTML for injection
    if (order.letter_html) {
      const html = order.letter_html;
      const hasRawScript = /<script[^>]*>/i.test(html) && !html.includes("&lt;script");
      const hasRawOnEvent = /\son\w+=/i.test(html) && !html.includes("&lt;img");
      const hasUnescapedQuotes = /[^&]"[^>]*>/i.test(html); // rough check

      if (hasRawScript) {
        console.log(`   ❌ UNESCAPED <script> tag found in HTML!`);
        const idx = html.indexOf("<script");
        console.log(`   Context: ...${html.slice(Math.max(0, idx - 30), idx + 50)}...`);
      } else {
        console.log(`   ✅ No raw <script> tags in HTML`);
      }

      if (hasRawOnEvent) {
        console.log(`   ❌ UNESCAPED on* event handler found in HTML!`);
      }

      // Check that special chars are properly escaped
      if (html.includes("&amp;") || html.includes("&lt;") || html.includes("&quot;")) {
        console.log(`   ✅ HTML entities found (escaping is working)`);
      }

      // Show a snippet
      const bodyMatch = html.match(/<div style="white-space:pre-wrap;">([\s\S]*?)<\/div>/);
      if (bodyMatch) {
        const snippet = bodyMatch[1].slice(0, 120);
        console.log(`   Body snippet: ${snippet}${bodyMatch[1].length > 120 ? "..." : ""}`);
      }
    }
  }

  // Check usage records
  const { data: usage } = await supabase
    .from("sendletter_api_usage")
    .select("id, order_id, letter_mode, amount_cents, billed")
    .in("order_id", createdOrderIds);

  console.log(`\n📊 Usage records: ${usage?.length || 0} (expected ${createdOrderIds.length})`);
  if (usage) {
    const totalCents = usage.reduce((s, u) => s + u.amount_cents, 0);
    console.log(`   Total charges: $${(totalCents / 100).toFixed(2)} CAD`);
    console.log(`   All unbilled: ${usage.every(u => !u.billed) ? "yes ✅" : "some billed ⚠️"}`);
  }
}

// ====================== MAIN ======================

async function main() {
  let passed = 0;
  let failed = 0;

  // Capture console.log to count passes/fails
  const origLog = console.log;
  console.log = (...args) => {
    const msg = args.join(" ");
    if (msg.startsWith("✅")) passed++;
    if (msg.startsWith("❌") && !msg.includes("Order")) failed++;
    origLog(...args);
  };

  try {
    await setup();

    await testAuth();
    await testJsonParsing();
    await testDraftMode();
    await testFormattedMode();
    await testUploadMode();
    await testAddressValidation();
    await testModeValidation();
    await testEscapeEdgeCases();
    await verifyOrders();

    console.log = origLog;
    console.log(`\n========================================`);
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log(`========================================`);
  } catch (e) {
    console.log = origLog;
    console.error("Test suite error:", e);
  } finally {
    await cleanup();
  }
}

main();
