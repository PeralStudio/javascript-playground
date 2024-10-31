"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { forwardRef } from "react";

interface TerminalOutputProps {
  output: string;
}

export const TerminalOutput = forwardRef<HTMLDivElement, TerminalOutputProps>(
  ({ output }, ref) => {
    return (
      <ScrollArea
        ref={ref}
        className="h-[calc(100%-4rem)] relative"
      >
        <div className="p-4">
          <pre className={`font-mono text-sm whitespace-pre-wrap break-words p-4 transition-colors duration-200`}
          >
            {output || "Console output will appear here..."}
          </pre>
        </div>
      </ScrollArea>
    );
  }
);