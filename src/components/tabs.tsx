"use client";

import { ReactNode } from "react";

type TabsProps = {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-white/10 bg-slate-950/70 p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            activeTab === tab.id
              ? "bg-cyan-500/20 text-cyan-200"
              : "text-slate-300 hover:bg-white/5 hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
