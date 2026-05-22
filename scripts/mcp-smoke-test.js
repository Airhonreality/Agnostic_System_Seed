const { spawn } = require('child_process');

const bridgeCommand = process.platform === 'win32'
  ? ['cmd.exe', ['/d', '/s', '/c', 'npx tsx scripts/mcp-bridge.ts']]
  : ['sh', ['-lc', 'npx tsx scripts/mcp-bridge.ts']];

const child = spawn(bridgeCommand[0], bridgeCommand[1], {
  stdio: ['pipe', 'pipe', 'pipe'],
  cwd: process.cwd(),
  env: process.env,
});

let buffer = Buffer.alloc(0);
const responses = new Map();
let finished = false;

function fail(message) {
  if (finished) return;
  finished = true;
  child.kill();
  console.error(message);
  process.exit(1);
}

function pass(message) {
  if (finished) return;
  finished = true;
  child.kill();
  console.log(message);
  process.exit(0);
}

function send(message) {
  const payload = JSON.stringify(message);
  child.stdin.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
}

function parseMessages(chunk) {
  buffer = Buffer.concat([buffer, chunk]);

  while (true) {
    const headerEnd = buffer.indexOf('\r\n\r\n');
    if (headerEnd === -1) return;

    const headerText = buffer.slice(0, headerEnd).toString('utf8');
    const match = headerText.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = Number(match[1]);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + contentLength;
    if (buffer.length < bodyEnd) return;

    const body = buffer.slice(bodyStart, bodyEnd).toString('utf8');
    const message = JSON.parse(body);
    if (message && message.id !== undefined) {
      responses.set(message.id, message);
    }

    buffer = buffer.slice(bodyEnd);
  }
}

child.stdout.on('data', parseMessages);
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
child.on('error', (error) => fail(`Failed to launch bridge: ${error.message}`));
child.on('exit', (code) => {
  if (!finished && code !== 0) {
    fail(`Bridge exited early with code ${code}`);
  }
});

send({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'mcp-smoke-test',
      version: '1.0.0'
    }
  }
});

send({
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list',
  params: {}
});

const started = Date.now();
const interval = setInterval(() => {
  const init = responses.get(1);
  const tools = responses.get(2);

  if (init && init?.result?.serverInfo?.name !== 'agnostic-system-seed') {
    return fail('initialize response missing expected serverInfo.name');
  }

  if (tools?.result?.tools?.length) {
    clearInterval(interval);
    return pass(`MCP smoke test passed with ${tools.result.tools.length} tools.`);
  }

  if (Date.now() - started > 10000) {
    return fail('tools/list did not return tools within 10 seconds');
  }
}, 50);