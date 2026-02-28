import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { saveAs } from 'file-saver';
import clsx from 'clsx';
import ChatWindow from '../components/Chat/ChatWindow';
import InputBar from '../components/Chat/InputBar';
import ExecutiveSummaryCard from '../components/Dashboard/ExecutiveSummaryCard';
import FactsList from '../components/Dashboard/FactsList';
import InsightsList from '../components/Dashboard/InsightsList';
import ComparisonTable from '../components/Dashboard/ComparisonTable';
import SWOTQuad from '../components/Dashboard/SWOTQuad';
import ChartsPanel from '../components/Dashboard/ChartsPanel';
import SourcesPanel from '../components/Dashboard/SourcesPanel';
import { continueRun, startRun, streamToChunks } from '../lib/toolhouse';
import { appendStrictJsonChunk, finalizeStrictJsonBuffer } from '../lib/strictJsonMode';
import { STRICT_REPORT_TRIGGER, isStrictReportTrigger } from '../lib/reportMode';
import { normalizeReportForUi } from '../lib/reportNormalizer';
import { applyRevenueOverride } from '../utils/analytics';

const STORAGE_KEYS = {
  currentRunId: 'toolhouse.currentRunId',
  runIndex: 'toolhouse.runIndex'
};

const TOOLHOUSE_DEFAULT_ENDPOINT =
  'https://agents.toolhouse.ai/4e95d8c9-714f-4e6b-a26f-5a445800f04b';

function createMessage({ role, content, isStreaming = false, hasReportPayload = false }) {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    role,
    content,
    timestamp: Date.now(),
    isStreaming,
    hasReportPayload
  };
}

function readJsonStorage(key, fallback) {
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_error) {
    return fallback;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function transcriptKey(runId) {
  return `transcript.${runId}`;
}

function reportKey(runId) {
  return `reports.${runId}`;
}

function upsertRunIndex(index, runId) {
  const now = Date.now();
  const existing = index.find((entry) => entry.runId === runId);

  if (existing) {
    return index
      .map((entry) => (entry.runId === runId ? { ...entry, updatedAt: now } : entry))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  return [{ runId, updatedAt: now }, ...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

function extractLatestQuarter(report) {
  return report?.financial_analysis_if_public?.latest_quarter || null;
}

export default function HomePage() {
  const [messages, setMessages] = useState([]);
  const [runId, setRunId] = useState(null);
  const [runIndex, setRunIndex] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [expectJson, setExpectJson] = useState(false);
  const [jsonBuffer, setJsonBuffer] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [lastStrictRequest, setLastStrictRequest] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [overrideRevenue, setOverrideRevenue] = useState('');
  const [useDemoMode, setUseDemoMode] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  const abortControllerRef = useRef(null);
  const activeRunIdRef = useRef(runId);

  useEffect(() => {
    activeRunIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    const storedRunIndex = readJsonStorage(STORAGE_KEYS.runIndex, []);
    const storedRunId = window.localStorage.getItem(STORAGE_KEYS.currentRunId);

    setRunIndex(storedRunIndex);

    if (storedRunId) {
      setRunId(storedRunId);
      setMessages(readJsonStorage(transcriptKey(storedRunId), []));
      const existingReport = readJsonStorage(reportKey(storedRunId), null);
      if (existingReport) {
        setCurrentReport(existingReport);
        setDashboardOpen(true);
      }
    }
  }, []);

  useEffect(() => {
    if (!runId) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.currentRunId, runId);
    setRunIndex((previous) => {
      const next = upsertRunIndex(previous, runId);
      writeJsonStorage(STORAGE_KEYS.runIndex, next);
      return next;
    });
  }, [runId]);

  useEffect(() => {
    if (!runId) {
      return;
    }

    writeJsonStorage(transcriptKey(runId), messages);
  }, [messages, runId]);

  useEffect(() => {
    if (!runId || !currentReport) {
      return;
    }

    writeJsonStorage(reportKey(runId), currentReport);
  }, [currentReport, runId]);

  const endpoint = useMemo(() => {
    if (useDemoMode) {
      return (
        process.env.NEXT_PUBLIC_DEMO_AGENT_URL ||
        'http://localhost:4010/4e95d8c9-714f-4e6b-a26f-5a445800f04b'
      );
    }

    // Prefer proxy in production deployments for reliability and key-hiding.
    if (useProxy || process.env.NODE_ENV === 'production') {
      return '/api/proxy-toolhouse';
    }

    return process.env.NEXT_PUBLIC_TOOLHOUSE_AGENT_URL || TOOLHOUSE_DEFAULT_ENDPOINT;
  }, [useDemoMode, useProxy]);

  const reportWithOverrides = useMemo(() => {
    const normalizedReport = normalizeReportForUi(currentReport);
    if (!normalizedReport) {
      return null;
    }

    const normalizedOverride = overrideRevenue === '' ? null : Number(overrideRevenue);
    return applyRevenueOverride(normalizedReport, normalizedOverride);
  }, [currentReport, overrideRevenue]);

  const latestQuarter = extractLatestQuarter(reportWithOverrides);

  const setAssistantMessage = (assistantId, updater) => {
    setMessages((previous) =>
      previous.map((message) => {
        if (message.id !== assistantId) {
          return message;
        }

        return typeof updater === 'function' ? updater(message) : { ...message, ...updater };
      })
    );
  };

  const handleStrictReport = (assistantId, parsedJson) => {
    setCurrentReport(parsedJson);
    setDashboardOpen(true);
    setJsonError('');
    setExpectJson(false);
    setAssistantMessage(assistantId, {
      isStreaming: false,
      hasReportPayload: true,
      content: 'Report generated — opening dashboard.'
    });

    const resolvedRunId = activeRunIdRef.current;
    if (resolvedRunId) {
      writeJsonStorage(reportKey(resolvedRunId), parsedJson);
    }
  };

  const sendMessage = async ({ message, mode = 'Quick', forceExpectJson = false }) => {
    if (isStreaming) {
      return;
    }

    const strictJsonMode = forceExpectJson || isStrictReportTrigger(message);
    const normalizedMessage = strictJsonMode ? STRICT_REPORT_TRIGGER : message;
    const outboundMessage = strictJsonMode ? STRICT_REPORT_TRIGGER : `[${mode} mode] ${message}`;

    if (strictJsonMode) {
      setLastStrictRequest({ message: STRICT_REPORT_TRIGGER, mode, forceExpectJson: true });
    }

    setExpectJson(strictJsonMode);
    setJsonBuffer('');
    setJsonError('');

    const userMessage = createMessage({ role: 'user', content: normalizedMessage });
    const assistantMessage = createMessage({
      role: 'assistant',
      content: strictJsonMode ? '⏳ Generating structured report…' : '',
      isStreaming: true
    });

    setMessages((previous) => [...previous, userMessage, assistantMessage]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let streamError = null;
    let strictBuffer = '';
    let parsedStrictReport = null;

    try {
      let reader;
      let resolvedRunId = runId;

      if (!resolvedRunId) {
        const started = await startRun({ endpoint, message: outboundMessage });
        reader = started.reader;

        if (started.runId) {
          resolvedRunId = started.runId;
          setRunId(started.runId);
          activeRunIdRef.current = started.runId;
        }
      } else {
        const continued = await continueRun({ endpoint, runId: resolvedRunId, message: outboundMessage });
        reader = continued.reader;
      }

      await streamToChunks({
        reader,
        signal: controller.signal,
        onChunk: (chunk) => {
          if (strictJsonMode) {
            const strictChunkResult = appendStrictJsonChunk(strictBuffer, chunk);
            strictBuffer = strictChunkResult.buffer;
            setJsonBuffer(strictBuffer);

            if (!parsedStrictReport && strictChunkResult.parsed) {
              parsedStrictReport = strictChunkResult.parsed;
            }
            return;
          }

          setAssistantMessage(assistantMessage.id, (messageState) => ({
            ...messageState,
            content: `${messageState.content}${chunk}`,
            isStreaming: true
          }));
        },
        onDone: () => {
          setAssistantMessage(assistantMessage.id, { isStreaming: false });
        },
        onError: (error) => {
          streamError = error;
        }
      });

      if (streamError) {
        throw streamError;
      }

      if (strictJsonMode) {
        const finalParsed = parsedStrictReport || finalizeStrictJsonBuffer(strictBuffer);
        if (finalParsed) {
          handleStrictReport(assistantMessage.id, finalParsed);
        } else {
          const invalidJsonMessage = 'Agent returned invalid JSON. Ask the agent to retry or try again.';
          setJsonError(invalidJsonMessage);
          setExpectJson(false);
          setAssistantMessage(assistantMessage.id, {
            isStreaming: false,
            content: invalidJsonMessage
          });
        }
      }
    } catch (error) {
      const fallbackMessage =
        strictJsonMode
          ? 'Agent returned invalid JSON. Ask the agent to retry or try again.'
          : `Unable to stream response: ${error.message}. You can retry or switch to Demo mode.`;

      if (strictJsonMode) {
        setJsonError(fallbackMessage);
        setExpectJson(false);
      }

      setAssistantMessage(assistantMessage.id, (messageState) => ({
        ...messageState,
        isStreaming: false,
        content: messageState.content || fallbackMessage
      }));
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const retryStrictReport = () => {
    if (!lastStrictRequest || isStreaming) {
      return;
    }

    sendMessage({ ...lastStrictRequest, forceExpectJson: true });
  };

  const cancelStreaming = () => {
    if (!abortControllerRef.current) {
      return;
    }

    abortControllerRef.current.abort();
    setIsStreaming(false);

    if (expectJson) {
      setExpectJson(false);
      setJsonError('Structured report generation was canceled. Retry to request JSON again.');
    }

    setMessages((previous) => {
      const next = [...previous];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].role === 'assistant' && next[index].isStreaming) {
          next[index] = {
            ...next[index],
            isStreaming: false,
            content: `${next[index].content}\n\n_Stream canceled by user._`
          };
          break;
        }
      }
      return next;
    });
  };

  const loadRun = (selectedRunId) => {
    if (!selectedRunId) {
      return;
    }

    setRunId(selectedRunId);
    setMessages(readJsonStorage(transcriptKey(selectedRunId), []));
    const loadedReport = readJsonStorage(reportKey(selectedRunId), null);
    setCurrentReport(loadedReport);
    setDashboardOpen(Boolean(loadedReport));
    setJsonBuffer('');
    setJsonError('');
    setExpectJson(false);
    window.localStorage.setItem(STORAGE_KEYS.currentRunId, selectedRunId);
  };

  const startFreshSession = () => {
    setRunId(null);
    setMessages([]);
    setCurrentReport(null);
    setDashboardOpen(false);
    setOverrideRevenue('');
    setJsonBuffer('');
    setJsonError('');
    setExpectJson(false);
    window.localStorage.removeItem(STORAGE_KEYS.currentRunId);
  };

  const refreshFrontend = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const exportJson = () => {
    if (!reportWithOverrides) {
      return;
    }

    const blob = new Blob([JSON.stringify(reportWithOverrides, null, 2)], {
      type: 'application/json;charset=utf-8'
    });

    const fileName = `business-report-${runId || 'local'}.json`;
    saveAs(blob, fileName);
  };

  const growthPlanRaw = reportWithOverrides?.['30_60_90_day_growth_plan'] || [];
  const growthPlan = (Array.isArray(growthPlanRaw)
    ? growthPlanRaw
    : Object.values(growthPlanRaw || {}))
    .map((step) => (Array.isArray(step) ? step.join(' ') : step))
    .filter((step) => Boolean(String(step || '').trim()));
  const revenueTimeseries =
    reportWithOverrides?.internal_data_analysis_if_provided?.computed_metrics?.revenue_timeseries || [];
  const segmentBreakdown =
    reportWithOverrides?.internal_data_analysis_if_provided?.computed_metrics?.segment_breakdown || [];

  return (
    <main className="min-h-screen pb-6">
      <div
        className="app-bg"
        style={{
          backgroundImage: `url(${process.env.NEXT_PUBLIC_UNSPLASH_IMAGE ||
            'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1920&q=80'})`
        }}
        role="img"
        aria-label="Subtle business city background"
      />
      <div className="app-overlay" />

      <div className="mx-auto grid w-full max-w-[1560px] gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="glass-panel h-fit rounded-2xl p-4">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-lg font-bold text-slate-100">Business Agent</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshFrontend}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 transition hover:border-accent"
                aria-label="Refresh frontend"
                title="Refresh frontend"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={startFreshSession}
                className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 transition hover:border-accent"
              >
                New
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2 text-xs text-slate-300">
              Demo mode
              <input
                type="checkbox"
                checked={useDemoMode}
                onChange={(event) => setUseDemoMode(event.target.checked)}
                aria-label="Toggle demo mode"
              />
            </label>
            <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-2 py-2 text-xs text-slate-300">
              Use proxy
              <input
                type="checkbox"
                checked={useProxy}
                onChange={(event) => setUseProxy(event.target.checked)}
                aria-label="Toggle proxy mode"
              />
            </label>
          </div>

          <div className="mt-4 rounded-lg border border-amber-500/50 bg-amber-500/10 p-2 text-[11px] text-amber-100">
            PII redaction notice: sensitive personal data is masked by default in this demo UI.
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-slate-400">Saved runs</p>
            <div className="mt-2 space-y-2">
              {runIndex.length === 0 ? (
                <p className="text-xs text-slate-500">No saved runs yet.</p>
              ) : (
                runIndex.map((entry) => (
                  <button
                    key={entry.runId}
                    type="button"
                    onClick={() => loadRun(entry.runId)}
                    className={clsx(
                      'w-full rounded-lg border px-2 py-2 text-left text-xs transition',
                      runId === entry.runId
                        ? 'border-accent bg-accent/15 text-slate-100'
                        : 'border-slate-700 bg-slate-900/60 text-slate-300 hover:border-slate-500'
                    )}
                  >
                    <p className="truncate font-semibold">{entry.runId}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {formatDistanceToNow(entry.updatedAt, { addSuffix: true })}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          <ChatWindow
            messages={messages}
            isStreaming={isStreaming}
            expectJson={expectJson}
            jsonBuffer={jsonBuffer}
            jsonError={jsonError}
            onCancel={cancelStreaming}
            onRetry={retryStrictReport}
          />
          <InputBar
            disabled={isStreaming}
            isStreaming={isStreaming}
            onSend={sendMessage}
            onCancel={cancelStreaming}
            onGenerateReport={sendMessage}
          />

          {dashboardOpen && reportWithOverrides ? (
            <section className="space-y-4 pt-2">
              <div className="glass-panel flex flex-wrap items-center justify-between gap-2 rounded-2xl p-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Dashboard report</h2>
                  <p className="text-xs text-slate-400">
                    Run ID: {runId || 'not assigned yet'} | Endpoint: {endpoint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportJson}
                  className="rounded-lg border border-accent/70 bg-accent/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:bg-accent/25"
                >
                  Export JSON
                </button>
              </div>

              <ExecutiveSummaryCard
                thesis={reportWithOverrides?.executive_summary?.thesis}
                confidence={reportWithOverrides?.executive_summary?.confidence || 0}
                overrideRevenue={overrideRevenue}
                onOverrideRevenue={setOverrideRevenue}
                hasManualOverride={overrideRevenue !== ''}
              />

              {latestQuarter ? (
                <section className="glass-panel rounded-2xl p-4">
                  <h3 className="text-lg font-semibold text-slate-100">Latest public quarter</h3>
                  <div className="mt-3 grid gap-3 md:grid-cols-4">
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Quarter</p>
                      <p className="mt-1 font-semibold">{latestQuarter.quarter || 'N/A'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Revenue</p>
                      <p className="mt-1 font-semibold">{Number(latestQuarter.revenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-400">EBITDA margin</p>
                      <p className="mt-1 font-semibold">{Math.round(Number(latestQuarter.ebitda_margin || 0) * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-100">
                      <p className="text-xs uppercase tracking-wide text-slate-400">EPS</p>
                      <p className="mt-1 font-semibold">{latestQuarter.eps ?? 'N/A'}</p>
                    </div>
                  </div>
                  {latestQuarter.source ? (
                    <a
                      href={latestQuarter.source}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-xs text-accent underline-offset-2 hover:underline"
                    >
                      Source link
                    </a>
                  ) : null}
                </section>
              ) : (
                <section className="glass-panel rounded-2xl p-4">
                  <h3 className="text-lg font-semibold text-slate-100">Latest public quarter</h3>
                  <p className="mt-2 text-sm text-slate-300">
                    No data available. Ask the agent for public-company financial details.
                  </p>
                </section>
              )}

              <div className="grid gap-4 xl:grid-cols-2">
                <FactsList facts={reportWithOverrides?.observed_facts || []} />
                <InsightsList insights={reportWithOverrides?.inferred_insights || []} />
              </div>

              <ComparisonTable rows={reportWithOverrides?.competitive_comparison_table || []} />
              <SWOTQuad swot={reportWithOverrides?.swot_analysis} />
              <ChartsPanel revenueTimeseries={revenueTimeseries} segmentBreakdown={segmentBreakdown} />

              <section className="glass-panel rounded-2xl p-4">
                <h3 className="text-lg font-semibold text-slate-100">30 / 60 / 90 day growth plan</h3>
                {growthPlan.length ? (
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {growthPlan.map((step, index) => (
                      <article
                        key={`plan-step-${index}`}
                        className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-3 text-sm text-slate-200"
                      >
                        <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Step {index + 1}</p>
                        <p>{step}</p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-300">
                    No data available. Ask the agent for a 30/60/90 day execution plan.
                  </p>
                )}
              </section>

              <SourcesPanel sources={reportWithOverrides?.sources || []} />
            </section>
          ) : null}
        </section>
      </div>
    </main>
  );
}
