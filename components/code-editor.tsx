"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Terminal, Circle, Copy } from "lucide-react";
import { toast } from "sonner";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EditorTab } from "./editor-tab";
import { EditorToolbar } from "./editor-toolbar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import axios from "axios";
import _ from "lodash";
import moment from "moment";
import dayjs from "dayjs";
import chalk from "chalk";
import * as R from "ramda";

interface FileTab {
    id: string;
    name: string;
    content: string;
    isEditing?: boolean;
}

const defaultCode = `// 🎉 Welcome to JavaScript Playground 🎉
// Write, experiment, and have fun!

function greet(name) {
    return "👋 Hello, " + name + "! Welcome to your playground.";
}
console.log(greet("Developer"));`;

const AVAILABLE_PACKAGES = {
    axios: axios,
    lodash: _,
    moment: moment,
    dayjs: dayjs,
    chalk: chalk,
    ramda: R
};

export function CodeEditor() {
    const [editorTheme, setEditorTheme] = useState<"vs-dark" | "light">("vs-dark");
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");
    const [packages, setPackages] = useState<string[]>([]);
    const [isPackageSheetOpen, setIsPackageSheetOpen] = useState(false);
    const outputRef = useRef<string[]>([]);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const [nextTabId, setNextTabId] = useState(1);
    const [tabs, setTabs] = useState<FileTab[]>([]);
    const [activeTab, setActiveTab] = useState("");

    useEffect(() => {
        const savedTabs = localStorage.getItem("playground-tabs");
        const savedActiveTab = localStorage.getItem("playground-active-tab");
        const savedNextTabId = localStorage.getItem("playground-next-tab-id");

        if (savedTabs) {
            setTabs(JSON.parse(savedTabs));
        } else {
            setTabs([{ id: "tab-1", name: "main.js", content: defaultCode }]);
        }

        if (savedActiveTab) {
            setActiveTab(savedActiveTab);
        } else {
            setActiveTab("tab-1");
        }

        if (savedNextTabId) {
            setNextTabId(parseInt(savedNextTabId));
        }

        const savedPackages = localStorage.getItem("playground-packages");
        if (savedPackages) {
            setPackages(JSON.parse(savedPackages));
        }
    }, []);

    useEffect(() => {
        if (tabs.length > 0) {
            localStorage.setItem("playground-tabs", JSON.stringify(tabs));
            localStorage.setItem("playground-active-tab", activeTab);
            localStorage.setItem("playground-next-tab-id", nextTabId.toString());
        }
    }, [tabs, activeTab, nextTabId]);

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector(
                "[data-radix-scroll-area-viewport]"
            );
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [output]);

    useEffect(() => {
        executeCode(getCurrentCode());
    }, [activeTab, packages]);

    const toggleEditorTheme = () => {
        setEditorTheme((prev: any) => (prev === "vs-dark" ? "light" : "vs-dark"));
    };

    const customConsole = {
        log: (...args: any[]) => {
            const formatted = args
                .map((arg) =>
                    typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
                )
                .join(" ");
            outputRef.current = [...outputRef.current, formatted];
            setOutput(outputRef.current.join("\n"));
        },
        error: (...args: any[]) => {
            const formatted = args.map((arg) => String(arg)).join(" ");
            outputRef.current = [...outputRef.current, `ReferenceError: ${formatted}`];
            setOutput(outputRef.current.join("\n"));
            setError(formatted);
        },
        clear: () => {
            outputRef.current = [];
            setOutput("");
            setError("");
        }
    };

    const createSafePackageProxy = (pkgName: string): any => {
        return new Proxy(() => {}, {
            get: (target, prop) => {
                customConsole.error(
                    `Package "${pkgName}" is not enabled. Enable it in the Packages menu.`
                );
                return createSafePackageProxy(pkgName);
            },
            apply: () => {
                customConsole.error(
                    `Package "${pkgName}" is not enabled. Enable it in the Packages menu.`
                );
                return undefined;
            }
        });
    };

    const executeCode = useCallback(
        (codeToExecute: string) => {
            outputRef.current = [];
            setOutput("");
            setError("");

            if (!codeToExecute || codeToExecute.trim() === "") {
                setOutput("Editor is empty. Please write some code! 🚀");
                return;
            }

            const createContext = () => {
                const context: Record<string, any> = { console: customConsole };

                Object.keys(AVAILABLE_PACKAGES).forEach((pkg) => {
                    if (packages.includes(pkg)) {
                        context[pkg] = AVAILABLE_PACKAGES[pkg as keyof typeof AVAILABLE_PACKAGES];
                    } else {
                        context[pkg] = createSafePackageProxy(pkg);
                    }
                });

                return context;
            };

            try {
                if (codeToExecute.trim() === "") {
                    customConsole.log("Editor is empty. Please write some code! 🚀");
                    return;
                }

                const wrappedCode = `
                try {
                    ${codeToExecute}
                } catch (error) {
                    console.error(error.message);
                }
            `;

                const context = createContext();
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                const func = new AsyncFunction(...Object.keys(context), wrappedCode);
                func(...Object.values(context));
            } catch (error) {
                if (error instanceof Error) {
                    customConsole.error(error.message);
                }
            }
        },
        [packages]
    );

    const handleEditorChange = (value: string | undefined) => {
        setTabs((prev: any) =>
            prev.map((tab: any) => (tab.id === activeTab ? { ...tab, content: value } : tab))
        );

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            executeCode(value);
        }, 750);
    };

    const addNewTab = () => {
        const newId = `tab-${nextTabId + 1}`;
        setNextTabId((prev) => prev + 1);
        const newTab = {
            id: newId,
            name: `untitled.js`,
            content: "// Start coding here\n"
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTab(newId);
    };

    const closeTab = (tabId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        if (tabs.length > 1) {
            const newTabs = tabs.filter((tab) => tab.id !== tabId);
            setTabs(newTabs);
            if (activeTab === tabId) {
                setActiveTab(newTabs[0].id);
            }
        }
    };

    const startRenaming = (tabId: string, event: React.MouseEvent) => {
        event.stopPropagation();
        setTabs((prev) =>
            prev.map((tab) => ({
                ...tab,
                isEditing: tab.id === tabId
            }))
        );
    };

    const handleRename = (tabId: string, newName: string) => {
        if (newName.trim()) {
            setTabs((prev) =>
                prev.map((tab) =>
                    tab.id === tabId
                        ? {
                              ...tab,
                              name: newName.endsWith(".js") ? newName : `${newName}.js`,
                              isEditing: false
                          }
                        : tab
                )
            );
        } else {
            cancelRename();
        }
    };

    const cancelRename = () => {
        setTabs((prev) => prev.map((tab) => ({ ...tab, isEditing: false })));
    };

    const getCurrentCode = () => {
        return tabs.find((tab) => tab.id === activeTab)?.content || "";
    };

    const clearCode = () => {
        setTabs((prev) =>
            prev.map((tab) => (tab.id === activeTab ? { ...tab, content: defaultCode } : tab))
        );
        executeCode(defaultCode);
        toast.info("Editor reset to default code");
    };

    const shareCode = async () => {
        try {
            const currentCode = getCurrentCode();
            const shareData = {
                title: "Check out this code!",
                text: currentCode,
                url: window.location.href
            };

            if (navigator.share) {
                await navigator.share(shareData);
                toast.success("Code shared successfully!");
            } else {
                await navigator.clipboard.writeText(currentCode);
                toast.success("Code copied to clipboard!");
            }
        } catch (error) {
            console.log(error);
            toast.error("Failed to share code:", error);
        }
    };

    const copyCode = async () => {
        try {
            await navigator.clipboard.writeText(getCurrentCode());
            toast.success("Code copied to clipboard!");
        } catch (error) {
            toast.error("Failed to copy code");
        }
    };

    const downloadCode = () => {
        const currentTab = tabs.find((tab) => tab.id === activeTab);
        const blob = new Blob([currentTab?.content || ""], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = currentTab?.name || "playground-code.js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Code downloaded successfully!");
    };

    const runCode = () => {
        executeCode(getCurrentCode());
        toast.success("Code executed!");
    };

    const togglePackage = () => {
        setIsPackageSheetOpen(true);
    };

    const handlePackageToggle = (pkg: string) => {
        setPackages((prev: any) => {
            const newPackages = prev.includes(pkg)
                ? prev.filter((p: any) => p !== pkg)
                : [...prev, pkg];
            localStorage.setItem("playground-packages", JSON.stringify(newPackages));
            return newPackages;
        });

        toast.success(packages.includes(pkg) ? `Package ${pkg} removed` : `Package ${pkg} added`);
    };

    return (
        <>
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
                <ResizablePanel defaultSize={50} minSize={35}>
                    <div className="h-full flex flex-col">
                        <EditorToolbar
                            packagesCount={packages.length}
                            editorTheme={editorTheme}
                            onRun={runCode}
                            onReset={clearCode}
                            onToggleTheme={toggleEditorTheme}
                            onDownload={downloadCode}
                            onShare={shareCode}
                            togglePackage={togglePackage}
                        />
                        <div className="border-b">
                            <div className="flex items-center">
                                {tabs.map((tab) => (
                                    <EditorTab
                                        key={tab.id}
                                        id={tab.id}
                                        name={tab.name}
                                        isActive={activeTab === tab.id}
                                        isEditing={!!tab.isEditing}
                                        onActivate={() => setActiveTab(tab.id)}
                                        onClose={(e) => closeTab(tab.id, e)}
                                        onStartRename={(e) => startRenaming(tab.id, e)}
                                        onRename={(newName) => handleRename(tab.id, newName)}
                                        onCancelRename={cancelRename}
                                    />
                                ))}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2"
                                    onClick={addNewTab}
                                >
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 relative">
                            {" "}
                            <div className="absolute top-2 right-6 z-10">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button onClick={copyCode} variant="ghost" size="sm">
                                                <Copy className="w-4 h-4" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Copy code</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>
                            <Editor
                                height="100%"
                                defaultLanguage="javascript"
                                theme={editorTheme}
                                value={getCurrentCode()}
                                onChange={handleEditorChange}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: "on",
                                    roundedSelection: false,
                                    scrollBeyondLastLine: true,
                                    automaticLayout: true,
                                    wordWrap: "on",
                                    suggestOnTriggerCharacters: true,
                                    formatOnPaste: true,
                                    formatOnType: true
                                }}
                            />
                        </div>
                    </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={50} minSize={30}>
                    <div className="h-full bg-black/5 dark:bg-white/5">
                        <div className="p-4 border-b bg-background/95">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Terminal className="w-5 h-5" />
                                    <h2 className="text-lg font-semibold">Console Output</h2>
                                </div>
                                <div className="flex gap-1.5">
                                    <Circle className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <Circle className="w-3 h-3 fill-green-400 text-green-400" />
                                    <Circle className="w-3 h-3 fill-red-400 text-red-400" />
                                </div>
                            </div>
                        </div>
                        <ScrollArea ref={scrollAreaRef} className="h-[calc(100%-4rem)] p-4">
                            <pre className="font-mono text-sm whitespace-pre-wrap break-words p-4 rounded-lg ">
                                {output || "Console output will appear here..."}
                            </pre>
                        </ScrollArea>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>

            <Sheet open={isPackageSheetOpen} onOpenChange={setIsPackageSheetOpen}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>Available Packages</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        <div className="space-y-4">
                            {Object.keys(AVAILABLE_PACKAGES).map((pkg) => (
                                <div key={pkg} className="flex items-center justify-between">
                                    <span className="text-sm font-medium">{pkg}</span>
                                    <Button
                                        size="sm"
                                        variant={packages.includes(pkg) ? "destructive" : "outline"}
                                        onClick={() => handlePackageToggle(pkg)}
                                    >
                                        {packages.includes(pkg) ? "Remove" : "Add"}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
