/**
 * Doctor Directory — Stress Test
 * Simulates concurrent users browsing, searching, and adding locations.
 *
 * Usage:
 *   node stress-test.js                        # default: 20 users, target localhost:3001
 *   node stress-test.js 50                     # 50 concurrent users
 *   node stress-test.js 30 https://doctorsdata.atcolab.com   # 30 users against production
 */

const CONCURRENT_USERS = parseInt(process.argv[2]) || 20;
const BASE_URL = process.argv[3] || 'http://localhost:3001';
const ACTIONS_PER_USER = 10; // each user performs 10 random actions

// ─── Helpers ──────────────────────────────────────────────
let stats = {
  totalRequests: 0,
  success: 0,
  failed: 0,
  errors: [],
  responseTimes: [],
  byEndpoint: {},
};

async function timedFetch(label, url, options = {}) {
  const start = Date.now();
  stats.totalRequests++;
  try {
    const res = await fetch(url, options);
    const elapsed = Date.now() - start;
    stats.responseTimes.push(elapsed);

    if (!stats.byEndpoint[label]) stats.byEndpoint[label] = { count: 0, totalMs: 0, errors: 0 };
    stats.byEndpoint[label].count++;
    stats.byEndpoint[label].totalMs += elapsed;

    if (!res.ok) {
      stats.failed++;
      stats.byEndpoint[label].errors++;
      stats.errors.push(`${label}: HTTP ${res.status} (${elapsed}ms)`);
      return null;
    }
    stats.success++;
    const data = await res.json();
    return data;
  } catch (err) {
    const elapsed = Date.now() - start;
    stats.failed++;
    if (!stats.byEndpoint[label]) stats.byEndpoint[label] = { count: 0, totalMs: 0, errors: 0 };
    stats.byEndpoint[label].count++;
    stats.byEndpoint[label].totalMs += elapsed;
    stats.byEndpoint[label].errors++;
    stats.errors.push(`${label}: ${err.message} (${elapsed}ms)`);
    return null;
  }
}

// ─── Simulated User Actions ────────────────────────────────
const SEARCH_TERMS = ['ahmed', 'ali', 'khan', 'gp', 'mbbs', 'fcps', 'cardio', 'surgeon', 'eye', 'ent', 'skin'];
const KPI_FILTERS = ['no-locations', 'single-location', 'multi-locations'];
const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Peshawar'];
const BRICKS = ['North', 'South', 'East', 'West', 'Central', 'DHA', 'Gulshan', 'Saddar'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function createSession(userId) {
  const roles = ['TSM', 'DSM', 'RSM'];
  return timedFetch('POST /api/user-session', `${BASE_URL}/api/user-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `StressUser_${userId}`,
      employee_code: 90000 + userId,
      role: roles[userId % 3],
      team: 'StressTest',
    }),
  });
}

async function browseDoctors(page = 1) {
  return timedFetch('GET /api/doctors', `${BASE_URL}/api/doctors?page=${page}&limit=50`);
}

async function searchDoctors() {
  const term = randomItem(SEARCH_TERMS);
  return timedFetch('GET /api/doctors?search', `${BASE_URL}/api/doctors?search=${term}&limit=50`);
}

async function filterByKpi() {
  const kpi = randomItem(KPI_FILTERS);
  return timedFetch(`GET /api/doctors?kpi=${kpi}`, `${BASE_URL}/api/doctors?kpi=${kpi}&limit=50`);
}

async function getDoctorDetail(doctorId) {
  return timedFetch('GET /api/doctors/:id', `${BASE_URL}/api/doctors/${doctorId}`);
}

async function getStats() {
  return timedFetch('GET /api/stats', `${BASE_URL}/api/stats`);
}

async function getFilterOptions() {
  return timedFetch('GET /api/filter-options', `${BASE_URL}/api/filter-options`);
}

async function addLocation(doctorId, sessionId) {
  return timedFetch('POST /api/doctors/:id/locations', `${BASE_URL}/api/doctors/${doctorId}/locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      city_name: randomItem(CITIES),
      brick_name: randomItem(BRICKS),
      location_name: `StressTest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      session_id: sessionId,
    }),
  });
}

// ─── Simulate One User ────────────────────────────────────
async function simulateUser(userId) {
  // 1. Create session
  const session = await createSession(userId);
  const sessionId = session?.session_id || 1;

  // 2. Get stats + filter options (like page load)
  await Promise.all([getStats(), getFilterOptions()]);

  // 3. Browse first page
  const firstPage = await browseDoctors(1);
  const doctorIds = firstPage?.doctors?.map(d => d.id) || [];

  // 4. Perform random actions
  for (let i = 0; i < ACTIONS_PER_USER; i++) {
    const action = Math.random();

    if (action < 0.25 && doctorIds.length > 0) {
      // View a doctor detail
      const docId = randomItem(doctorIds);
      await getDoctorDetail(docId);
    } else if (action < 0.45) {
      // Search
      await searchDoctors();
    } else if (action < 0.60) {
      // KPI filter
      await filterByKpi();
    } else if (action < 0.75) {
      // Browse another page
      const page = Math.floor(Math.random() * 10) + 1;
      await browseDoctors(page);
    } else if (action < 0.85) {
      // Get stats
      await getStats();
    } else if (doctorIds.length > 0) {
      // Add a location (write operation)
      const docId = randomItem(doctorIds);
      await addLocation(docId, sessionId);
    }

    // Small random delay to simulate real user think time (50-300ms)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 250));
  }
}

// ─── Main ──────────────────────────────────────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Doctor Directory — Stress Test             ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Target:     ${BASE_URL.padEnd(32)}║`);
  console.log(`║  Users:      ${String(CONCURRENT_USERS).padEnd(32)}║`);
  console.log(`║  Actions:    ${String(ACTIONS_PER_USER).padEnd(20)} per user     ║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('\nStarting...\n');

  const startTime = Date.now();

  // Launch all users concurrently
  const userPromises = [];
  for (let i = 0; i < CONCURRENT_USERS; i++) {
    userPromises.push(simulateUser(i));
  }
  await Promise.all(userPromises);

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // ─── Results ─────────────────────────────────────────
  const times = stats.responseTimes.sort((a, b) => a - b);
  const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(0);
  const p50 = times[Math.floor(times.length * 0.5)];
  const p95 = times[Math.floor(times.length * 0.95)];
  const p99 = times[Math.floor(times.length * 0.99)];
  const max = times[times.length - 1];

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║              RESULTS                         ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Total Time:      ${totalTime}s`.padEnd(47) + '║');
  console.log(`║  Total Requests:  ${stats.totalRequests}`.padEnd(47) + '║');
  console.log(`║  ✅ Success:      ${stats.success}`.padEnd(47) + '║');
  console.log(`║  ❌ Failed:       ${stats.failed}`.padEnd(47) + '║');
  console.log(`║  Throughput:      ${(stats.totalRequests / parseFloat(totalTime)).toFixed(1)} req/s`.padEnd(47) + '║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  Response Times:'.padEnd(47) + '║');
  console.log(`║    Average:  ${avg}ms`.padEnd(47) + '║');
  console.log(`║    P50:      ${p50}ms`.padEnd(47) + '║');
  console.log(`║    P95:      ${p95}ms`.padEnd(47) + '║');
  console.log(`║    P99:      ${p99}ms`.padEnd(47) + '║');
  console.log(`║    Max:      ${max}ms`.padEnd(47) + '║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║  By Endpoint:'.padEnd(47) + '║');
  for (const [label, data] of Object.entries(stats.byEndpoint)) {
    const avgMs = (data.totalMs / data.count).toFixed(0);
    const line = `  ${label}: ${data.count} calls, avg ${avgMs}ms${data.errors ? `, ${data.errors} err` : ''}`;
    console.log(`║${line}`.padEnd(47) + '║');
  }
  console.log('╚══════════════════════════════════════════════╝');

  if (stats.errors.length > 0) {
    console.log(`\n⚠️  ${stats.errors.length} errors (showing first 10):`);
    stats.errors.slice(0, 10).forEach(e => console.log(`   • ${e}`));
  }

  // Verdict
  console.log('\n');
  if (stats.failed === 0 && parseInt(avg) < 500) {
    console.log('🟢 PASS — No failures, fast responses. App can handle the load!');
  } else if (stats.failed === 0) {
    console.log('🟡 WARN — No failures, but some slow responses. Consider optimization.');
  } else if (stats.failed / stats.totalRequests < 0.05) {
    console.log('🟡 WARN — A few failures (<5%). Check the error log above.');
  } else {
    console.log('🔴 FAIL — Significant failures. The app may not handle this many concurrent users.');
  }
}

main().catch(console.error);
