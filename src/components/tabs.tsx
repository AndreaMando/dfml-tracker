"use client";

import { ReactNode } from "react";

type TabsProps = {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (tabId: string) => void;
};

export function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-2 rounded-3xl border border-line bg-surface p-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
            activeTab === tab.id
              ? "bg-azure-soft text-azure-deep"
              : "text-ink-muted hover:bg-surface-alt hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
