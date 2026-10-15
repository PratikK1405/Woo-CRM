import React from "react";

const STATUS_CONFIG = {
  pending: {
    label: "Pending payment",
    bg: "bg-[#FFFBEB]",
    text: "text-[#B45309]",
    border: "border-[#FDE68A]",
    dot: "bg-[#F59E0B]",
  },
  processing: {
    label: "Processing",
    bg: "bg-[#EEF1FF]",
    text: "text-[#3140C4]",
    border: "border-[#C7D0FF]",
    dot: "bg-[#3D4EE8]",
  },
  "on-hold": {
    label: "On hold",
    bg: "bg-[#FFFBEB]",
    text: "text-[#B45309]",
    border: "border-[#FDE68A]",
    dot: "bg-[#D97706]",
  },
  completed: {
    label: "Completed",
    bg: "bg-[#ECFDF3]",
    text: "text-[#15803D]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#16A34A]",
  },
  cancelled: {
    label: "Cancelled",
    bg: "bg-[#F1F5F9]",
    text: "text-[#475569]",
    border: "border-[#E2E8F0]",
    dot: "bg-[#94A3B8]",
  },
  refunded: {
    label: "Refunded",
    bg: "bg-[#F5F3FF]",
    text: "text-[#6D28D9]",
    border: "border-[#DDD6FE]",
    dot: "bg-[#8B5CF6]",
  },
  failed: {
    label: "Failed",
    bg: "bg-[#FEF2F2]",
    text: "text-[#B91C1C]",
    border: "border-[#FECACA]",
    dot: "bg-[#EF4444]",
  },
};

export function StatusPill({ status }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] || {
    label: status || "Unknown",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
