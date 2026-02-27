import fs from 'node:fs';
import path from 'node:path';
import { appendStrictJsonChunk, finalizeStrictJsonBuffer } from '../lib/strictJsonMode';
import { STRICT_REPORT_TRIGGER } from '../lib/reportMode';

describe('strict JSON streaming mode', () => {
  test('buffers chunks, parses strict JSON, and populates dashboard state', () => {
    const fixturePath = path.join(process.cwd(), 'data', 'fixtures', 'strict_report.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const payload = JSON.stringify(fixture);

    const chunks = [];
    const chunkSize = 23;
    for (let index = 0; index < payload.length; index += chunkSize) {
      chunks.push(payload.slice(index, index + chunkSize));
    }

    const clientState = {
      expectJson: true,
      trigger: STRICT_REPORT_TRIGGER,
      renderedMarkdown: '',
      jsonBuffer: '',
      currentReport: null,
      dashboardOpen: false
    };

    expect(clientState.trigger).toBe('generate full structured business analytics report');

    for (const chunk of chunks) {
      const result = appendStrictJsonChunk(clientState.jsonBuffer, chunk);
      clientState.jsonBuffer = result.buffer;

      // Strict mode should not render markdown while buffering.
      expect(clientState.renderedMarkdown).toBe('');

      if (result.parsed && !clientState.currentReport) {
        clientState.currentReport = result.parsed;
        clientState.dashboardOpen = true;
      }
    }

    if (!clientState.currentReport) {
      clientState.currentReport = finalizeStrictJsonBuffer(clientState.jsonBuffer);
      clientState.dashboardOpen = Boolean(clientState.currentReport);
    }

    expect(clientState.currentReport).toEqual(fixture);
    expect(clientState.dashboardOpen).toBe(true);
  });
});
