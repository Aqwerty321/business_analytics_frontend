const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = process.env.DEMO_PORT || 4010;
const BASE_PATH = '/4e95d8c9-714f-4e6b-a26f-5a445800f04b';
const STRICT_TRIGGER = 'generate full structured business analytics report';

function readFixture(fileName) {
  const fixturePath = path.join(__dirname, '..', 'data', 'fixtures', fileName);
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
}

function isStrictTrigger(message = '') {
  return String(message).trim().toLowerCase() === STRICT_TRIGGER;
}

function chooseFixture(message = '') {
  const normalized = String(message).toLowerCase();
  if (normalized.includes('public')) {
    return readFixture('public_co.json');
  }

  if (normalized.includes('saas')) {
    return readFixture('private_saas.json');
  }

  return readFixture('d2c_cupcake.json');
}

function streamPayload(response, payloadText) {
  const chunks = payloadText.match(/.{1,80}/gs) || [payloadText];
  let index = 0;

  const timer = setInterval(() => {
    if (index >= chunks.length) {
      clearInterval(timer);
      response.end();
      return;
    }

    response.write(chunks[index]);
    index += 1;
  }, 60);
}

function writeCors(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST,PUT,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    const parts = [];
    request.on('data', (chunk) => parts.push(chunk));
    request.on('end', () => {
      try {
        const raw = Buffer.concat(parts).toString('utf8') || '{}';
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on('error', reject);
  });
}

const server = http.createServer(async (request, response) => {
  writeCors(response);

  if (request.method === 'OPTIONS') {
    response.statusCode = 200;
    response.end();
    return;
  }

  if (request.method !== 'POST' && request.method !== 'PUT') {
    response.statusCode = 404;
    response.end('Not found');
    return;
  }

  if (!request.url.startsWith(BASE_PATH)) {
    response.statusCode = 404;
    response.end('Route not found');
    return;
  }

  try {
    const body = await collectBody(request);
    const runId = randomUUID();
    const strictMode = isStrictTrigger(body.message);

    let streamText;
    if (strictMode) {
      streamText = JSON.stringify(readFixture('strict_report.json'));
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
    } else {
      const fixture = chooseFixture(body.message);
      streamText = [
        '## Demo stream\\n',
        `Processing request: ${body.message || 'N/A'}\\n\\n`,
        'Switch to strict report mode by sending the exact trigger phrase.\\n\\n',
        '```json\\n',
        `${JSON.stringify(fixture, null, 2)}\\n`,
        '```\\n'
      ].join('');
      response.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    }

    response.statusCode = 200;
    response.setHeader('Transfer-Encoding', 'chunked');

    if (request.method === 'POST') {
      response.setHeader('X-Toolhouse-Run-ID', runId);
    }

    streamPayload(response, streamText);
  } catch (error) {
    response.statusCode = 500;
    response.end(`Demo server error: ${error.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Demo streaming server listening on http://localhost:${PORT}${BASE_PATH}`);
  console.log(`Strict JSON trigger: "${STRICT_TRIGGER}"`);
});
