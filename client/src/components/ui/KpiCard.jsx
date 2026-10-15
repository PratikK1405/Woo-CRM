import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export function KpiCard({
  title,
  value,
  delta,
  isPositive = true,
  comparison = "vs last week",
  icon: Icon,
  solidPrimary = false,
}) {
  if (solidPrimary) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#3D4EE8] p-5 text-white shadow-md transition-all hover:shadow-lg">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider uppercase text-[#E0E5FF]">
            {title}
          </span>
          {Icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-xs">
              <Icon className="h-5 w-5 text-white" />
            </div>
          )}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tabular-nums tracking-tight">{value}</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-[#E0E5FF]">
          <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 font-semibold text-white">
            {isPositive ? (
              <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
            ) : (
              <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
            )}
            {delta}
          </span>
          <span className="opacity-90">{comparison}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-[#E5E8F0] bg-white p-5 shadow-xs transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider uppercase text-[#64748B]">
          {title}
        </span>
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF1FF] text-[#3D4EE8]">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-[#0F172A] tracking-tight">
          {value}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
            isPositive ? "bg-[#ECFDF3] text-[#15803D]" : "bg-[#FEF2F2] text-[#B91C1C]"
          }`}
        >
          {isPositive ? (
            <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="mr-0.5 h-3.5 w-3.5" />
          )}
          {delta}
        </span>
        <span className="text-[#64748B]">{comparison}</span>
      </div>
    </div>
  );
}
