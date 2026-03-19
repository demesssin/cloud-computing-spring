/**
 * pricingEngine.js — CFO Bot Pricing Engine
 * All functions are pure (no side effects, deterministic).
 * Pricing derived from SSOT v1.0.0 Section 2.
 */

const PRICING = {
  compute: {
    micro:   { price: 5.00,   vCPU: 0.25, ram: 0.5 },
    small:   { price: 18.00,  vCPU: 1,    ram: 2   },
    medium:  { price: 35.00,  vCPU: 2,    ram: 4   },
    large:   { price: 90.00,  vCPU: 4,    ram: 16  },
    xlarge:  { price: 175.00, vCPU: 8,    ram: 32  },
  },
  storage: {
    perGB: 0.020,
    readPer10K: 0.004,
    writePer10K: 0.005,
  },
  egress: [
    { limit: 1024,  rate: 0.08 },
    { limit: 10240, rate: 0.06 },
    { limit: Infinity, rate: 0.05 },
  ],
  database: {
    postgresql: {
      micro:    { price: 25.00,  includedStorage: 10  },
      standard: { price: 85.00,  includedStorage: 50  },
      premium:  { price: 220.00, includedStorage: 200 },
    },
    mysql: {
      micro:    { price: 23.00, includedStorage: 10 },
      standard: { price: 80.00, includedStorage: 50 },
    },
    extraStoragePerGB: 0.17,
    firestore: {
      readPer100K:   0.06,
      writePer100K:  0.18,
      deletePer100K: 0.02,
      storagePer_GB: 0.108,
    },
  },
  llm: {
    gpt4o:         { inputPer1M: 2.00,  outputPer1M: 15.00 },
    gpt4o_mini:    { inputPer1M: 0.15,  outputPer1M: 0.50  },
    claude_sonnet: { inputPer1M: 3.00,  outputPer1M: 15.00 },
    claude_haiku:  { inputPer1M: 0.25,  outputPer1M: 0.80  },
    gemini_pro:    { inputPer1M: 1.40,  outputPer1M: 3.50  },
    gemini_flash:  { inputPer1M: 0.20,  outputPer1M: 1.00  },
  },
  serverless: {
    freeInvocations: 2_000_000,
    perMillionInvocations: 0.40,
    perGBSecond: 0.00001667,
  },
  bandwidth: [
    { limit: 1024,     rate: 0.08 },
    { limit: 10240,    rate: 0.06 },
    { limit: Infinity, rate: 0.04 },
  ],
};

/**
 * Calculate tiered cost (used for egress and bandwidth).
 * @param {number} gb - Total GB
 * @param {Array} tiers - Array of {limit, rate}
 * @returns {number} Total cost
 */
function calculateTieredCost(gb, tiers) {
  let remaining = gb;
  let total = 0;
  let prev = 0;

  for (const tier of tiers) {
    if (remaining <= 0) break;
    const tierSize = tier.limit - prev;
    const billable = Math.min(remaining, tierSize);
    total += billable * tier.rate;
    remaining -= billable;
    prev = tier.limit;
  }

  return total;
}

/**
 * Calculate compute cost.
 * @param {string} tier - micro|small|medium|large|xlarge
 * @param {number} instanceCount
 * @param {number} hoursPerDay - 0-24
 * @param {number} daysPerMonth - 0-31
 * @returns {number} Monthly cost in USD
 */
function calculateCompute(tier, instanceCount, hoursPerDay = 24, daysPerMonth = 30) {
  const config = PRICING.compute[tier.toLowerCase()];
  if (!config) throw new Error(`Unknown compute tier: ${tier}`);
  const uptimeFraction = (hoursPerDay / 24) * (daysPerMonth / 30);
  return round2(config.price * instanceCount * uptimeFraction);
}

/**
 * Calculate storage cost.
 * @param {number} storageGB
 * @param {number} readOps
 * @param {number} writeOps
 * @param {number} egressGB
 * @returns {{storage: number, ops: number, egress: number, total: number}}
 */
function calculateStorage(storageGB, readOps = 0, writeOps = 0, egressGB = 0) {
  const storage = round2(storageGB * PRICING.storage.perGB);
  const reads   = round2((readOps  / 10000) * PRICING.storage.readPer10K);
  const writes  = round2((writeOps / 10000) * PRICING.storage.writePer10K);
  const ops     = round2(reads + writes);
  const egress  = round2(calculateTieredCost(egressGB, PRICING.egress));
  const total   = round2(storage + ops + egress);
  return { storage, reads, writes, ops, egress, total };
}

/**
 * Calculate egress cost (standalone).
 * @param {number} gb
 * @returns {number}
 */
function calculateEgress(gb) {
  return round2(calculateTieredCost(gb, PRICING.egress));
}

/**
 * Calculate relational database cost.
 * @param {string} engine - postgresql|mysql
 * @param {string} tier - micro|standard|premium
 * @param {number} actualStorageGB
 * @returns {number}
 */
function calculateDatabase(engine, tier, actualStorageGB = 0) {
  const engineKey = engine.toLowerCase();
  const tierKey   = tier.toLowerCase();
  const config = PRICING.database[engineKey]?.[tierKey];
  if (!config) throw new Error(`Unknown DB config: ${engine} ${tier}`);

  const extraStorage = Math.max(0, actualStorageGB - config.includedStorage);
  const extraCost    = extraStorage * PRICING.database.extraStoragePerGB;
  return round2(config.price + extraCost);
}

/**
 * Calculate Firestore cost.
 * @param {number} reads
 * @param {number} writes
 * @param {number} deletes
 * @param {number} storageGB
 * @returns {number}
 */
function calculateFirestore(reads = 0, writes = 0, deletes = 0, storageGB = 0) {
  const p = PRICING.database.firestore;
  const cost = (reads   / 100000) * p.readPer100K
             + (writes  / 100000) * p.writePer100K
             + (deletes / 100000) * p.deletePer100K
             + storageGB * p.storagePer_GB;
  return round2(cost);
}

/**
 * Calculate LLM API cost.
 * @param {string} model - gpt4o|gpt4o_mini|claude_sonnet|claude_haiku|gemini_pro|gemini_flash
 * @param {number} inputTokens
 * @param {number} outputTokens
 * @returns {number}
 */
function calculateLLM(model, inputTokens = 0, outputTokens = 0) {
  const config = PRICING.llm[model];
  if (!config) throw new Error(`Unknown LLM model: ${model}`);
  const inputCost  = (inputTokens  / 1_000_000) * config.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * config.outputPer1M;
  return round2(inputCost + outputCost);
}

/**
 * Calculate serverless functions cost.
 * @param {number} monthlyInvocations
 * @param {number} memoryMB - 128|256|512|1024|2048
 * @param {number} avgDurationSec
 * @returns {{invocations: number, compute: number, total: number}}
 */
function calculateServerless(monthlyInvocations = 0, memoryMB = 256, avgDurationSec = 0.1) {
  const p = PRICING.serverless;
  const billableInv = Math.max(0, monthlyInvocations - p.freeInvocations);
  const invCost     = (billableInv / 1_000_000) * p.perMillionInvocations;

  const gbSeconds   = monthlyInvocations * avgDurationSec * (memoryMB / 1024);
  const computeCost = gbSeconds * p.perGBSecond;

  return {
    invocations: round2(invCost),
    compute:     round2(computeCost),
    total:       round2(invCost + computeCost),
  };
}

/**
 * Calculate CDN/bandwidth cost.
 * @param {number} trafficGB
 * @returns {number}
 */
function calculateBandwidth(trafficGB) {
  return round2(calculateTieredCost(trafficGB, PRICING.bandwidth));
}

/**
 * Round to 2 decimal places.
 * @param {number} val
 * @returns {number}
 */
function round2(val) {
  return Math.round(val * 100) / 100;
}

// ─── Test Runner (run in console with runAllTests()) ──────────────────────────
function runAllTests() {
  let passed = 0, failed = 0;

  function assert(id, actual, expected, tol = 0.01) {
    const ok = Math.abs(actual - expected) <= tol;
    const status = ok ? '✅' : '❌';
    console.log(`${status} ${id}: expected $${expected.toFixed(4)}, got $${actual.toFixed(4)}`);
    ok ? passed++ : failed++;
  }

  // Compute
  assert("TC-COMP-001", calculateCompute("micro",  1, 24, 30), 5.00);
  assert("TC-COMP-002", calculateCompute("medium", 3, 24, 30), 105.00);
  assert("TC-COMP-003", calculateCompute("large",  2, 8,  20), 40.00);
  assert("TC-COMP-004", calculateCompute("medium", 0, 24, 30), 0.00);
  assert("TC-COMP-005", calculateCompute("xlarge", 5, 12, 30), 437.50);

  // Storage
  assert("TC-STOR-001", calculateStorage(100, 0, 0, 0).total,        2.00);
  assert("TC-STOR-002", calculateStorage(500, 1000000, 500000, 0).total, 10.65);
  assert("TC-STOR-003", calculateStorage(0, 0, 0, 500).total,        40.00);
  assert("TC-STOR-004", calculateStorage(0, 0, 0, 2000).egress,      140.48);
  assert("TC-STOR-005", calculateStorage(0, 0, 0, 12000).egress,     722.88);

  // Database
  assert("TC-DB-001", calculateDatabase("postgresql", "standard", 50),  85.00);
  assert("TC-DB-002", calculateDatabase("postgresql", "standard", 80),  90.10);
  assert("TC-DB-003", calculateDatabase("mysql",      "micro",     5),  23.00);
  assert("TC-DB-004", calculateDatabase("postgresql", "premium",  350), 245.50);
  assert("TC-DB-005", calculateFirestore(500000, 100000, 10000, 20),     2.642, 0.01);

  // LLM
  assert("TC-LLM-001", calculateLLM("gpt4o",         1000000,   100000),   3.50);
  assert("TC-LLM-002", calculateLLM("gpt4o_mini",   10000000,  2000000),   2.50);
  assert("TC-LLM-003", calculateLLM("claude_sonnet", 5000000,  1000000),  30.00);
  assert("TC-LLM-004", calculateLLM("claude_haiku", 100000000,20000000),  41.00);
  assert("TC-LLM-005", calculateLLM("gemini_flash",  50000000,10000000),  20.00);
  assert("TC-LLM-006", calculateLLM("gemini_pro",    2000000,   500000),   4.55);

  // Serverless
  assert("TC-SVL-001", calculateServerless(1000000, 256, 0.5).invocations, 0.00);
  assert("TC-SVL-002", calculateServerless(5000000, 256, 0.2).invocations, 1.20);
  assert("TC-SVL-003", calculateServerless(5000000, 256, 0.2).compute,     4.17, 0.02);
  assert("TC-SVL-004", calculateServerless(5000000, 256, 0.2).total,       5.37, 0.02);

  // Bandwidth
  assert("TC-BW-001", calculateBandwidth(500),   40.00);
  assert("TC-BW-002", calculateBandwidth(1024),  81.92);
  assert("TC-BW-003", calculateBandwidth(5000),  320.48);
  assert("TC-BW-004", calculateBandwidth(15000), 825.28);

  // Edge cases
  assert("TC-EDGE-001", calculateStorage(0,0,0,0).total, 0.00);
  assert("TC-EDGE-002", calculateLLM("gpt4o", 0, 0), 0.00);
  assert("TC-EDGE-003", calculateServerless(2000000, 256, 0.1).invocations, 0.00);

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(failed === 0 ? '🎉 ALL TESTS PASSED' : '🚨 SOME TESTS FAILED');
}

// Export for use in other modules
if (typeof module !== 'undefined') {
  module.exports = {
    calculateCompute, calculateStorage, calculateEgress,
    calculateDatabase, calculateFirestore,
    calculateLLM, calculateServerless, calculateBandwidth,
    PRICING, runAllTests
  };
}
