"use client";

import { Terminal, Circle } from "lucide-react";

export function TerminalHeader() {
  return (
    <div className="p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Console Output</h2>
        </div>
        <div className="flex gap-1.5">
          <Circle className="w-3 h-3 fill-[#ffbd2e] text-[#ffbd2e] transition-colors" />
          <Circle className="w-3 h-3 fill-[#28c840] text-[#28c840] transition-colors" />
          <Circle className="w-3 h-3 fill-[#ff5f56] text-[#ff5f56] transition-colors" />
        </div>
      </div>
    </div>
  );
}