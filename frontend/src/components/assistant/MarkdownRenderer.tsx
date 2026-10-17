"use client";

import React from "react";

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Parse simple markdown into structured elements safely
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let keyIdx = 0;

  const flushList = () => {
    if (inList && listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${keyIdx++}`}
          className="list-disc list-outside ml-4 my-2 space-y-1 text-xs text-[#252525] leading-relaxed"
        >
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushCode = () => {
    if (inCodeBlock && codeBuffer.length > 0) {
      elements.push(
        <pre
          key={`code-${keyIdx++}`}
          className="bg-[#1E293B] text-[#F1F5F9] p-3 rounded-lg text-[11px] font-mono my-2 overflow-x-auto border border-slate-700 leading-normal"
        >
          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );
      codeBuffer = [];
      inCodeBlock = false;
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // Bold: **text**
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-bold text-[#14181F]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#0067A5] font-mono text-[11px] border border-[#E2E8F0]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block toggle
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={`h4-${keyIdx++}`}
          className="font-bold text-xs text-[#0067A5] mt-3 mb-1 uppercase tracking-wide"
        >
          {formatInline(line.slice(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      elements.push(
        <h3
          key={`h3-${keyIdx++}`}
          className="font-bold text-sm text-[#14181F] mt-3.5 mb-1.5 border-b border-[#E5E7EB] pb-1"
        >
          {formatInline(line.slice(3))}
        </h3>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      elements.push(
        <h2
          key={`h2-${keyIdx++}`}
          className="font-bold text-base text-[#14181F] mt-4 mb-2"
        >
          {formatInline(line.slice(2))}
        </h2>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      elements.push(
        <blockquote
          key={`quote-${keyIdx++}`}
          className="border-l-3 border-[#0067A5] pl-3 py-1 my-2 bg-[#DCEFF7]/30 text-xs italic text-[#475569] rounded-r"
        >
          {formatInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // List item (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      inList = true;
      const itemContent = line.replace(/^\s*[-*]\s+/, "");
      listItems.push(
        <li key={`li-${keyIdx++}`} className="leading-relaxed">
          {formatInline(itemContent)}
        </li>
      );
      continue;
    }

    // Numbered list item (1. 2. etc.)
    if (/^\s*\d+\.\s+/.test(line)) {
      flushList();
      const numMatch = line.match(/^\s*(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div
            key={`num-${keyIdx++}`}
            className="flex items-start gap-2 my-1.5 text-xs text-[#252525] leading-relaxed"
          >
            <span className="font-bold text-[#0067A5] text-[11px] bg-[#DCEFF7] w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              {numMatch[1]}
            </span>
            <div className="flex-1">{formatInline(numMatch[2])}</div>
          </div>
        );
        continue;
      }
    }

    // Regular line
    flushList();
    if (line.trim() === "") {
      elements.push(<div key={`sp-${keyIdx++}`} className="h-1.5" />);
    } else {
      elements.push(
        <p
          key={`p-${keyIdx++}`}
          className="text-xs text-[#252525] leading-relaxed my-1"
        >
          {formatInline(line)}
        </p>
      );
    }
  }

  flushList();
  flushCode();

  return <div className="space-y-0.5">{elements}</div>;
}
