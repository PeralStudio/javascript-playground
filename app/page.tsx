import { CodeEditor } from '@/components/code-editor';
import { Terminal as TerminalIcon, Circle } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-8 h-8" />
            <h1 className="text-2xl font-bold">JavaScript Playground</h1>
          </div>
        </div>
        
        <div className="h-[calc(100vh-8rem)]">
          <CodeEditor />
        </div>
      </div>
    </main>
  );
}