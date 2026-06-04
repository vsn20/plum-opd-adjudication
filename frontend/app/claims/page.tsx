"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  ClipboardList,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  Clock,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  Calendar,
  User,
  Stethoscope,
  Loader2,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ───── Types ───── */
interface DecisionData {
  decision: string;
  approved_amount: number;
  rejection_reasons: string[];
  confidence_score: number;
  notes: string;
  next_steps: string;
  flags: string[];
}

interface ClaimRecord {
  claim_id: string;
  member_id: string;
  treatment_date: string;
  submission_date: string;
  claim_amount: number;
  hospital_name: string;
  diagnosis: string;
  status: string;
  created_at: string;
  decision: DecisionData | null;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; className: string }> = {
  APPROVED:      { icon: CheckCircle2,  className: "badge-approved" },
  REJECTED:      { icon: XCircle,       className: "badge-rejected" },
  PARTIAL:       { icon: AlertTriangle, className: "badge-partial" },
  MANUAL_REVIEW: { icon: Eye,           className: "badge-manual-review" },
  PENDING:       { icon: Clock,         className: "badge-pending" },
  PROCESSING:    { icon: Clock,         className: "badge-pending" },
};

export default function ClaimsHistoryPage() {
  const [claims, setClaims] = useState<ClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchClaims = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get<ClaimRecord[]>(`${API_BASE}/api/claims/`);
      setClaims(data);
    } catch (err) {
      setError("Failed to fetch claims. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  // Filters
  const filtered = claims.filter((c) => {
    const matchesSearch =
      !searchQuery ||
      c.claim_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.member_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.diagnosis || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: claims.length,
    approved: claims.filter((c) => c.status === "APPROVED").length,
    rejected: claims.filter((c) => c.status === "REJECTED").length,
    partial: claims.filter((c) => c.status === "PARTIAL").length,
    review: claims.filter((c) => c.status === "MANUAL_REVIEW").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-sky-50/30">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ClipboardList size={22} className="text-purple-500" />
                Claims History
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                View and track all submitted claims
              </p>
            </div>
            <button
              onClick={fetchClaims}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 stagger">
          {[
            { label: "Total", value: stats.total, color: "text-gray-800", bg: "bg-gray-50" },
            { label: "Approved", value: stats.approved, color: "text-emerald-700", bg: "bg-emerald-50" },
            { label: "Rejected", value: stats.rejected, color: "text-red-700", bg: "bg-red-50" },
            { label: "Partial", value: stats.partial, color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Review", value: stats.review, color: "text-purple-700", bg: "bg-purple-50" },
          ].map((stat) => (
            <div
              key={stat.label}
              className={`${stat.bg} rounded-xl p-4 text-center animate-fade-in`}
            >
              <p className="text-2xl font-bold ${stat.color}">{stat.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by claim ID, member ID, or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300
                placeholder:text-gray-300"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm
                focus:outline-none focus:ring-2 focus:ring-purple-400/40 appearance-none bg-white cursor-pointer"
            >
              <option value="ALL">All Status</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PARTIAL">Partial</option>
              <option value="MANUAL_REVIEW">Manual Review</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
            <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={32} className="text-purple-400 animate-spin mb-3" />
            <p className="text-sm text-gray-400">Loading claims...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <ClipboardList size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-500 font-medium">No claims found</p>
            <p className="text-sm text-gray-400 mt-1">
              {claims.length === 0
                ? "Submit your first claim to get started"
                : "Try adjusting your search or filters"}
            </p>
          </div>
        )}

        {/* Claims list */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3 stagger">
            {filtered.map((claim) => {
              const isExpanded = expandedId === claim.claim_id;
              const statusConf = STATUS_CONFIG[claim.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusConf.icon;

              return (
                <div
                  key={claim.claim_id}
                  className="card overflow-hidden animate-fade-in"
                >
                  {/* Summary row */}
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : claim.claim_id)
                    }
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="shrink-0">
                        <span className={`badge ${statusConf.className}`}>
                          <StatusIcon size={12} />
                          {claim.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 font-mono">
                          {claim.claim_id}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {claim.diagnosis || "No diagnosis"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-gray-800">
                          ₹{claim.claim_amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-gray-400">
                          {claim.member_id}
                        </p>
                      </div>
                      <div className="text-right hidden md:block">
                        <p className="text-xs text-gray-500">
                          {claim.treatment_date}
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} className="text-gray-400" />
                      ) : (
                        <ChevronDown size={16} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isExpanded && claim.decision && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4 animate-fade-in">
                      {/* Info grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <InfoCell
                          icon={User}
                          label="Member"
                          value={claim.member_id}
                        />
                        <InfoCell
                          icon={Calendar}
                          label="Treatment Date"
                          value={claim.treatment_date}
                        />
                        <InfoCell
                          icon={IndianRupee}
                          label="Approved Amount"
                          value={`₹${claim.decision.approved_amount.toLocaleString("en-IN")}`}
                        />
                        <InfoCell
                          icon={Stethoscope}
                          label="Confidence"
                          value={`${Math.round(claim.decision.confidence_score * 100)}%`}
                        />
                      </div>

                      {/* Rejection reasons */}
                      {claim.decision.rejection_reasons.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-2">
                            Rejection Reasons
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {claim.decision.rejection_reasons.map((r, i) => (
                              <span
                                key={i}
                                className="font-mono text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg"
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {claim.decision.notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            Notes
                          </p>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {claim.decision.notes}
                          </p>
                        </div>
                      )}

                      {/* Next steps */}
                      {claim.decision.next_steps && (
                        <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-100">
                          <p className="text-xs font-semibold text-purple-600 mb-1">
                            Next Steps
                          </p>
                          <p className="text-sm text-purple-700">
                            {claim.decision.next_steps}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ───── Helper component ───── */
function InfoCell({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
      <Icon size={14} className="text-gray-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-gray-800">{value}</p>
      </div>
    </div>
  );
}
