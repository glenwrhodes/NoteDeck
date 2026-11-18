// End-to-end smoke test for a running NoteDeck stack.
//
//   docker compose up --build -d --wait
//   node scripts/smoke-test.mjs            (needs Node 18+ on your PC)
//
// It goes through the browser's entry point (http://localhost:8088), so every
// request also passes through nginx in the web container. It registers two
// fresh users and checks the whole notes lifecycle, plus that neither user can
// see the other's notes.

const BASE = process.env.BASE_URL || `http://localhost:${process.env.WEB_PORT || 8088}`;
let passed = 0;
let failed = 0;

function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`  PASS  ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

// A tiny "browser": remembers its session cookie between requests.
function client() {
  let cookie = '';
  return async function call(method, path, body, raw) {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
    for (const c of res.headers.getSetCookie()) {
      const pair = c.split(';')[0];
      cookie = pair.endsWith('=') ? '' : pair; // cleared cookie => logged out
    }
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  };
}

const suffix = Date.now().toString(36);
const alice = { username: `alice_${suffix}`, password: 'correct-horse-1' };
const bob = { username: `bob_${suffix}`, password: 'battery-staple-2' };

console.log(`NoteDeck smoke test against ${BASE}\n`);

const anon = client();
const a = client();
const b = client();

console.log('Web container (nginx)');
let r = await anon('GET', '/');
check('GET / serves the React app', r.status === 200 && r.text.includes('<div id="root">'));
r = await anon('GET', '/notes/123');
check('deep link /notes/123 falls back to index.html', r.status === 200 && r.text.includes('<div id="root">'));

console.log('\nAPI health and auth');
r = await anon('GET', '/api/health');
check('GET /api/health reports db ok', r.status === 200 && r.json?.db === 'ok', JSON.stringify(r.json));
r = await anon('GET', '/api/notes');
check('notes need login (401)', r.status === 401);
r = await anon('GET', '/api/auth/me');
check('me is null when logged out', r.status === 200 && r.json?.user === null);
r = await anon('POST', '/api/auth/register', { username: 'x', password: 'long-enough-1' });
check('short username rejected (400)', r.status === 400);
r = await anon('POST', '/api/auth/register', { username: `carol_${suffix}`, password: 'short' });
check('short password rejected (400)', r.status === 400);
r = await anon('POST', '/api/auth/register', 'garbage', '{not json');
check('invalid JSON rejected (400)', r.status === 400);

r = await a('POST', '/api/auth/register', alice);
check('alice registers (201)', r.status === 201 && r.json?.user?.username === alice.username);
check('user response has no database id', r.json?.user && !('id' in r.json.user));
r = await anon('POST', '/api/auth/register', alice);
check('duplicate username rejected (409)', r.status === 409);
r = await a('GET', '/api/auth/me');
check('alice session cookie works', r.json?.user?.username === alice.username);

console.log('\nNotes CRUD');
r = await a('POST', '/api/notes', { title: '', body: 'no title' });
check('note without title rejected (400)', r.status === 400);
r = await a('POST', '/api/notes', { title: 'First contact', body: 'Line one\nLine two' });
check("create alice's first note: number 1", r.status === 201 && r.json?.note?.number === 1, JSON.stringify(r.json));
check('note response has no database id', r.json?.note && !('id' in r.json.note));
r = await a('POST', '/api/notes', { title: 'Second thoughts', body: '' });
check("alice's second note: number 2", r.json?.note?.number === 2);
r = await a('GET', '/api/notes');
check(
  'list shows both notes, newest first',
  r.json?.notes?.length === 2 && r.json.notes[0].number === 2 && r.json.notes[1].preview.startsWith('Line one'),
);
r = await a('GET', '/api/notes/1');
check('read note returns full body', r.json?.note?.body === 'Line one\nLine two');
r = await a('PUT', '/api/notes/1', { title: 'First contact (edited)', body: 'Updated' });
check('update note', r.status === 200 && r.json?.note?.title === 'First contact (edited)');
r = await a('GET', '/api/notes/abc');
check('non-numeric note number is 404', r.status === 404);

console.log('\nIsolation between users');
r = await b('POST', '/api/auth/register', bob);
check('bob registers', r.status === 201);
r = await b('GET', '/api/notes');
check("bob's list is empty", Array.isArray(r.json?.notes) && r.json.notes.length === 0);
r = await b('GET', '/api/notes/1');
check("bob can't read alice's note 1 (404)", r.status === 404);
r = await b('PUT', '/api/notes/1', { title: 'hacked', body: '' });
check("bob can't edit alice's note 1 (404)", r.status === 404);
r = await b('DELETE', '/api/notes/1');
check("bob can't delete alice's note 1 (404)", r.status === 404);
r = await b('POST', '/api/notes', { title: "Bob's own note", body: '' });
check("bob's first note is number 1 too (numbers are per user)", r.json?.note?.number === 1);
r = await b('GET', '/api/notes/1');
check('bob\'s /api/notes/1 is his own note', r.json?.note?.title === "Bob's own note");
r = await a('GET', '/api/notes/1');
check("alice's note 1 is untouched", r.json?.note?.title === 'First contact (edited)');

console.log('\nStatus, delete, log out, log in');
r = await a('GET', '/api/status');
check('status reports db host "db"', r.json?.db?.host === 'db' && r.json?.user?.noteCount === 2, JSON.stringify(r.json));
r = await a('DELETE', '/api/notes/2');
check('delete note (204)', r.status === 204);
r = await a('GET', '/api/notes/2');
check('deleted note is gone (404)', r.status === 404);
r = await a('POST', '/api/notes', { title: 'After the delete', body: '' });
check('numbers are not reused after a delete (next is 3)', r.json?.note?.number === 3);
r = await a('DELETE', '/api/notes/3');
check('clean up note 3', r.status === 204);
r = await a('POST', '/api/auth/logout');
check('log out', r.status === 200);
r = await a('GET', '/api/notes');
check('logged out => 401', r.status === 401);
r = await a('POST', '/api/auth/login', { ...alice, password: 'wrong-password' });
check('wrong password rejected (401)', r.status === 401);
r = await a('POST', '/api/auth/login', { username: alice.username.toUpperCase(), password: alice.password });
check('log in (username is case-insensitive)', r.status === 200);

// Leave one note behind, so a restart test has something to look for.
r = await a('POST', '/api/notes', { title: 'Survives restart', body: `Written by the smoke test at ${new Date().toISOString()}` });
check('create a note to check after a restart', r.status === 201);

console.log(`\n${passed} passed, ${failed} failed`);
console.log(`Restart check: log in as ${alice.username} / ${alice.password} and look for "Survives restart".`);
process.exit(failed ? 1 : 0);
