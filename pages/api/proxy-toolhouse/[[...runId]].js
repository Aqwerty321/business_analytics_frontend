const TOOLHOUSE_DEFAULT_ENDPOINT =
  'https://agents.toolhouse.ai/4e95d8c9-714f-4e6b-a26f-5a445800f04b';

async function streamResponseToNode(upstreamResponse, res) {
  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  const reader = upstreamResponse.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    res.write(Buffer.from(value));
  }

  res.end();
}

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.setHeader('Allow', 'POST,PUT');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const baseEndpoint = process.env.TOOLHOUSE_AGENT_URL || TOOLHOUSE_DEFAULT_ENDPOINT;
    let targetUrl = baseEndpoint.replace(/\/$/, '');

    if (req.method === 'PUT') {
      const segments = Array.isArray(req.query.runId) ? req.query.runId : [];
      const incomingRunId = segments[0];

      if (!incomingRunId) {
        res.status(400).json({ error: 'runId is required for PUT' });
        return;
      }

      targetUrl = `${targetUrl}/${encodeURIComponent(incomingRunId)}`;
    }

    const upstreamResponse = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body || {})
    });

    const responseRunId = upstreamResponse.headers.get('x-toolhouse-run-id');
    if (responseRunId) {
      res.setHeader('X-Toolhouse-Run-ID', responseRunId);
    }

    res.status(upstreamResponse.status);
    res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'text/markdown; charset=utf-8');
    await streamResponseToNode(upstreamResponse, res);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Proxy request failed' });
  }
}
