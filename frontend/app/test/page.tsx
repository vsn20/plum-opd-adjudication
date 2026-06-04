"use client";

import { useState } from "react";
import axios from "axios";
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Zap,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ───── Types ───── */
interface Comparison {
  passed: boolean;
  details: string[];
}

interface TestResult {
  case_id: string;
  case_name: string;
  description?: string;
  status: string;
  expected?: Record<string, unknown>;
  actual?: Record<string, unknown>;
  comparison: Comparison;
  error?: string;
}

interface RunAllResponse {
  total: number;
  passed: number;
  failed: number;
  pass_rate: string;
  results: TestResult[];
}

export default function TestRunnerPage() {
  const [results, setResults] = useState<RunAllResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSingle, setLoadingSingle] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const runAll = async () => {
    setLoading(true);
    setError("");
    setResults(null);
    try {
      const { data } = await axios.post<RunAllResponse>(
        `${API_BASE}/api/test/run-all`
      );
      setResults(data);
    } catch (err) {
      setError(
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.message
          : "Failed to run tests"
      );
    } finally {
      setLoading(false);
    }
  };

  const runSingle = async (caseId: string) => {
    setLoadingSingle(caseId);
    try {
      const { data } = await axios.post<TestResult>(
        `${API_BASE}/api/test/run/${caseId}`
      );
      // Merge into results
      if (results) {
        const newResults = results.results.map((r) =>
          r.case_id === caseId ? data : r
        );
        const passed = newResults.filter((r) => r.status === "PASS").length;
        setResults({
          ...results,
          results: newResults,
          passed,
          failed: results.total - passed,
          pass_rate: `${Math.round((passed / results.total) * 100)}%`,
        });
      }
    } catch (err) {
      // ignore
    } finally {
      setLoadingSingle(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/20">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FlaskConical size={22} className="text-purple-500" />
                Test Runner
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Run adjudication test cases from test_cases.json
              </p>
            </div>
            <button
              onClick={runAll}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
                text-white transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #0ea5e9)",
              }}
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Play size={16} />
              )}
              {loading ? "Running..." : "Run All Tests"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
            <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="card-elevated p-12 text-center animate-fade-in">
            <Loader2 size={40} className="mx-auto text-purple-400 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Running all 10 test cases...
            </h3>
            <p className="text-sm text-gray-500">
              This may take a minute as it includes LLM-powered medical review
            </p>
          </div>
        )}

        {/* Initial state */}
        {!loading && !results && !error && (
          <div className="card-elevated p-16 text-center animate-fade-in">
            <div
              className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center animate-float"
              style={{
                background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
              }}
            >
              <FlaskConical size={36} className="text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Ready to Test
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
              Run all 10 test cases from test_cases.json to verify the
              adjudication engine produces correct decisions for each scenario.
            </p>
            <button
              onClick={runAll}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold
                text-white hover:shadow-lg transition-all"
              style={{
                background: "linear-gradient(135deg, #6d28d9, #0ea5e9)",
              }}
            >
              <Zap size={16} />
              Run All Test Cases
            </button>
          </div>
        )}

        {/* Results */}
        {results && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-4 gap-3 animate-fade-in">
              <StatCard
                label="Total"
                value={results.total}
                color="text-gray-800"
                bg="bg-gray-50"
              />
              <StatCard
                label="Passed"
                value={results.passed}
                color="text-emerald-700"
                bg="bg-emerald-50"
              />
              <StatCard
                label="Failed"
                value={results.failed}
                color="text-red-700"
                bg="bg-red-50"
              />
              <div className="rounded-xl p-4 text-center bg-gradient-to-br from-purple-50 to-sky-50">
                <p className="text-2xl font-bold text-purple-700">
                  {results.pass_rate}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Pass Rate</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden animate-fade-in">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: results.pass_rate,
                  background:
                    results.failed === 0
                      ? "linear-gradient(90deg, #10b981, #34d399)"
                      : "linear-gradient(90deg, #10b981, #f59e0b)",
                }}
              />
            </div>

            {/* Test results list */}
            <div className="space-y-2 stagger">
              {results.results.map((tr) => {
                const isExpanded = expandedId === tr.case_id;
                const isPassed = tr.status === "PASS";
                const isError = tr.status === "ERROR";

                return (
                  <div
                    key={tr.case_id}
                    className="card overflow-hidden animate-fade-in"
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() =>
                        setExpandedId(isExpanded ? null : tr.case_id)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setExpandedId(isExpanded ? null : tr.case_id);
                        }
                      }}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        {isPassed ? (
                          <CheckCircle2
                            size={20}
                            className="text-emerald-500 shrink-0"
                          />
                        ) : isError ? (
                          <AlertTriangle
                            size={20}
                            className="text-amber-500 shrink-0"
                          />
                        ) : (
                          <XCircle
                            size={20}
                            className="text-red-500 shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-800">
                            <span className="font-mono text-purple-600 mr-2">
                              {tr.case_id}
                            </span>
                            {tr.case_name}
                          </p>
                          {tr.description && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {tr.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`badge ${
                            isPassed ? "badge-approved" : isError ? "badge-partial" : "badge-rejected"
                          }`}
                        >
                          {tr.status}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            runSingle(tr.case_id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Re-run this test"
                        >
                          {loadingSingle === tr.case_id ? (
                            <Loader2
                              size={14}
                              className="text-purple-500 animate-spin"
                            />
                          ) : (
                            <RotateCcw
                              size={14}
                              className="text-gray-400"
                            />
                          )}
                        </button>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded comparison */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-gray-100 pt-4 animate-fade-in">
                        {tr.error && (
                          <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 mb-4">
                            {tr.error}
                          </div>
                        )}

                        {/* Comparison details */}
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-gray-500 mb-2">
                            Comparison Details
                          </p>
                          {tr.comparison.details.map((d, i) => (
                            <p
                              key={i}
                              className={`text-sm flex items-center gap-2 py-1 ${
                                tr.comparison.passed
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {tr.comparison.passed ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <XCircle size={14} />
                              )}
                              {d}
                            </p>
                          ))}
                        </div>

                        {/* Expected vs Actual */}
                        {tr.expected && tr.actual && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-2">
                                Expected
                              </p>
                              <pre className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600 overflow-auto max-h-48 font-mono">
                                {JSON.stringify(tr.expected, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-2">
                                Actual
                              </p>
                              <pre className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-xs text-gray-600 overflow-auto max-h-48 font-mono">
                                {JSON.stringify(tr.actual, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───── Stat Card ───── */
function StatCard({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className={`${bg} rounded-xl p-4 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
