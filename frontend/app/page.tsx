"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import {
  Upload,
  X,
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  ArrowRight,
  ShieldCheck,
  Zap,
  Stethoscope,
  IndianRupee,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ───── Types ───── */
interface DocumentResult {
  file_name: string;
  doc_type: string;
  is_legible: boolean;
  missing_fields: string[];
  fields: Record<string, unknown>;
}

interface DecisionData {
  decision: string;
  approved_amount: number;
  rejection_reasons: string[];
  confidence_score: number;
  notes: string;
  next_steps: string;
  flags: string[];
}

interface SubmitResult {
  claim_id: string;
  member_id: string;
  status: string;
  message: string;
  documents_processed: number;
  documents: DocumentResult[];
  decision: DecisionData;
}

/* ───── Processing Steps ───── */
const PROCESSING_STEPS = [
  { label: "Uploading documents", icon: Upload },
  { label: "Extracting text (OCR)", icon: FileText },
  { label: "Analyzing medical data", icon: Stethoscope },
  { label: "Running adjudication", icon: ShieldCheck },
  { label: "Building decision", icon: Zap },
];

/* ───── Decision config ───── */
const DECISION_CONFIG: Record<
  string,
  { color: string; bg: string; border: string; icon: React.ElementType; label: string }
> = {
  APPROVED: {
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
    label: "Approved",
  },
  REJECTED: {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: XCircle,
    label: "Rejected",
  },
  PARTIAL: {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
    label: "Partially Approved",
  },
  MANUAL_REVIEW: {
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Eye,
    label: "Manual Review",
  },
};

/* ───── Confidence Gauge ───── */
function ConfidenceGauge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (score * circumference);
  const color =
    pct >= 90
      ? "#10b981"
      : pct >= 75
        ? "#f59e0b"
        : "#ef4444";

  return (
    <div className="confidence-ring mx-auto" title={`${pct}% confidence`}>
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle className="track" cx="40" cy="40" r="34" />
        <circle
          className="fill"
          cx="40"
          cy="40"
          r="34"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-gray-800">{pct}%</span>
        <span className="text-[9px] text-gray-400 font-medium">confidence</span>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */
export default function SubmitClaimPage() {
  const [memberId, setMemberId] = useState("EMP001");
  const [treatmentDate, setTreatmentDate] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [error, setError] = useState("");
  const [showDocs, setShowDocs] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) {
      setError("Please upload at least one document.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setProcessingStep(0);

    // Simulate processing steps
    const stepInterval = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev < PROCESSING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 1500);

    const formData = new FormData();
    formData.append("member_id", memberId);
    formData.append("treatment_date", treatmentDate);
    formData.append("claim_amount", claimAmount);
    formData.append("hospital_name", hospitalName);
    files.forEach((f) => formData.append("files", f));

    try {
      const { data } = await axios.post<SubmitResult>(
        `${API_BASE}/api/claims/submit`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      clearInterval(stepInterval);
      setProcessingStep(PROCESSING_STEPS.length - 1);
      // Small delay for the last step animation
      setTimeout(() => {
        setResult(data);
        setLoading(false);
      }, 600);
    } catch (err: unknown) {
      clearInterval(stepInterval);
      const message =
        axios.isAxiosError(err)
          ? err.response?.data?.detail || err.message
          : "An unexpected error occurred";
      setError(message);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setResult(null);
    setFiles([]);
    setClaimAmount("");
    setTreatmentDate("");
    setHospitalName("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/30">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Submit New Claim</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Upload your medical documents for AI-powered adjudication
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Show result or form */}
        {result ? (
          <DecisionResult result={result} showDocs={showDocs} setShowDocs={setShowDocs} onReset={resetForm} />
        ) : (
          <>
            {/* Loading overlay */}
            {loading && (
              <div className="card-elevated p-8 mb-6 animate-fade-in">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">
                  Processing your claim...
                </h3>
                <div className="space-y-3 max-w-sm mx-auto stagger">
                  {PROCESSING_STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const isActive = i === processingStep;
                    const isDone = i < processingStep;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 animate-fade-in ${
                          isActive
                            ? "bg-purple-50 border border-purple-200"
                            : isDone
                              ? "bg-emerald-50/50"
                              : "opacity-40"
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        ) : isActive ? (
                          <Loader2 size={18} className="text-purple-600 shrink-0 animate-spin" />
                        ) : (
                          <Icon size={18} className="text-gray-300 shrink-0" />
                        )}
                        <span
                          className={`text-sm font-medium ${
                            isActive
                              ? "text-purple-700"
                              : isDone
                                ? "text-emerald-700"
                                : "text-gray-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Form */}
            {!loading && (
              <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                {/* Row 1: Member ID + Treatment Date */}
                <div className="card-elevated p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Stethoscope size={16} className="text-purple-500" />
                    Claim Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="member-id"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                      >
                        Member ID
                      </label>
                      <input
                        id="member-id"
                        type="text"
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        required
                        placeholder="e.g. EMP001"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                          focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300
                          transition-all placeholder:text-gray-300"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="treatment-date"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                      >
                        Date of Treatment
                      </label>
                      <input
                        id="treatment-date"
                        type="date"
                        value={treatmentDate}
                        onChange={(e) => setTreatmentDate(e.target.value)}
                        required
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                          focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300
                          transition-all"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="claim-amount"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                      >
                        Claim Amount (₹)
                      </label>
                      <div className="relative">
                        <IndianRupee
                          size={14}
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                        />
                        <input
                          id="claim-amount"
                          type="number"
                          value={claimAmount}
                          onChange={(e) => setClaimAmount(e.target.value)}
                          required
                          min={500}
                          placeholder="1500"
                          className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm
                            focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300
                            transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="hospital-name"
                        className="block text-xs font-medium text-gray-500 mb-1.5"
                      >
                        Hospital / Clinic{" "}
                        <span className="text-gray-300">(optional)</span>
                      </label>
                      <input
                        id="hospital-name"
                        type="text"
                        value={hospitalName}
                        onChange={(e) => setHospitalName(e.target.value)}
                        placeholder="e.g. Apollo Hospitals"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                          focus:outline-none focus:ring-2 focus:ring-purple-400/40 focus:border-purple-300
                          transition-all placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <div className="card-elevated p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <Upload size={16} className="text-purple-500" />
                    Upload Documents
                  </h3>
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
                      isDragActive
                        ? "border-purple-400 bg-purple-50/60 scale-[1.01]"
                        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/20"
                    }`}
                  >
                    <input {...getInputProps()} />
                    <div
                      className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
                      style={{
                        background:
                          "linear-gradient(135deg, #f5f3ff, #ede9fe)",
                      }}
                    >
                      <Upload
                        size={20}
                        className={
                          isDragActive ? "text-purple-600" : "text-purple-400"
                        }
                      />
                    </div>
                    <p className="text-sm font-medium text-gray-600">
                      {isDragActive
                        ? "Drop your files here..."
                        : "Drag & drop medical documents"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Bills, prescriptions, lab reports — PDF or Images
                    </p>
                  </div>

                  {/* File list */}
                  {files.length > 0 && (
                    <ul className="mt-4 space-y-2 stagger">
                      {files.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between text-sm bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 animate-fade-in"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText size={16} className="text-purple-400 shrink-0" />
                            <span className="truncate text-gray-700 font-medium">
                              {f.name}
                            </span>
                            <span className="text-xs text-gray-400 shrink-0">
                              {(f.size / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-in">
                    <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm
                    transition-all duration-200 disabled:opacity-50
                    hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]
                    flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #6d28d9, #0ea5e9)",
                  }}
                >
                  <ShieldCheck size={18} />
                  Submit Claim for Adjudication
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ───── Decision Result Component ───── */
function DecisionResult({
  result,
  showDocs,
  setShowDocs,
  onReset,
}: {
  result: SubmitResult;
  showDocs: boolean;
  setShowDocs: (v: boolean) => void;
  onReset: () => void;
}) {
  const decision = result.decision;
  const config = DECISION_CONFIG[decision.decision] || DECISION_CONFIG.MANUAL_REVIEW;
  const Icon = config.icon;

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Decision hero card */}
      <div className={`card-elevated p-8 ${config.bg} ${config.border} border`}>
        <div className="flex flex-col items-center text-center">
          <div
            className={`w-16 h-16 rounded-2xl ${config.bg} flex items-center justify-center mb-4 animate-scale-in`}
            style={{ animationDelay: "0.1s" }}
          >
            <Icon size={32} className={config.color} />
          </div>
          <h2 className={`text-2xl font-bold ${config.color} mb-1`}>
            {config.label}
          </h2>
          <p className="text-sm text-gray-500">
            Claim ID:{" "}
            <span className="font-mono font-semibold text-gray-700">
              {result.claim_id}
            </span>
          </p>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="text-center p-4 bg-white/60 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Claimed</p>
            <p className="text-lg font-bold text-gray-800">
              ₹{Number(result.decision.approved_amount || 0).toLocaleString("en-IN") !== "0"
                ? Number(result.documents[0]?.fields?.total_amount || result.decision.approved_amount || 0).toLocaleString("en-IN")
                : "0"}
            </p>
          </div>
          <div className="text-center p-4 bg-white/60 rounded-xl">
            <p className="text-xs text-gray-400 mb-1">Approved</p>
            <p className={`text-lg font-bold ${config.color}`}>
              ₹{decision.approved_amount.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-center">
            <ConfidenceGauge score={decision.confidence_score} />
          </div>
        </div>
      </div>

      {/* Rejection reasons */}
      {decision.rejection_reasons.length > 0 && (
        <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            Rejection Reasons
          </h3>
          <div className="space-y-2">
            {decision.rejection_reasons.map((reason, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100"
              >
                <span className="font-mono text-xs font-semibold text-red-600 bg-red-100 px-2 py-0.5 rounded">
                  {reason}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fraud flags */}
      {decision.flags.length > 0 && (
        <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" />
            Fraud Flags
          </h3>
          <div className="space-y-2">
            {decision.flags.map((flag, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-sm text-amber-700"
              >
                ⚠️ {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes + Next Steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {decision.notes && (
          <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {decision.notes}
            </p>
          </div>
        )}
        {decision.next_steps && (
          <div className="card-elevated p-5 animate-fade-in" style={{ animationDelay: "0.35s" }}>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Next Steps</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              {decision.next_steps}
            </p>
          </div>
        )}
      </div>

      {/* Document analysis toggle */}
      <div className="card-elevated overflow-hidden animate-fade-in" style={{ animationDelay: "0.4s" }}>
        <button
          onClick={() => setShowDocs(!showDocs)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText size={16} className="text-purple-500" />
            Document Analysis ({result.documents_processed} documents)
          </span>
          {showDocs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showDocs && (
          <div className="px-5 pb-5 space-y-3 stagger">
            {result.documents.map((doc, i) => (
              <div
                key={i}
                className="border border-gray-100 rounded-xl p-4 animate-fade-in"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-sm text-gray-800 truncate">
                    {doc.file_name}
                  </span>
                  <span
                    className={`badge ${
                      doc.is_legible ? "badge-approved" : "badge-rejected"
                    }`}
                  >
                    {doc.is_legible ? "✓ Legible" : "✗ Illegible"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 capitalize">
                  Type: {doc.doc_type.replace(/_/g, " ")}
                </p>
                {doc.missing_fields.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    Missing: {doc.missing_fields.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit another */}
      <button
        onClick={onReset}
        className="w-full py-3 rounded-xl font-semibold text-sm border-2 border-purple-200
          text-purple-700 hover:bg-purple-50 transition-all"
      >
        Submit Another Claim
      </button>
    </div>
  );
}