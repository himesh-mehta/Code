"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  Download,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api";

interface CsvUploadPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export function CsvUploadPanel({
  isOpen,
  onClose,
  onImportSuccess,
}: CsvUploadPanelProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.name.endsWith(".csv")) {
        setFile(droppedFile);
        setMessage(null);
      } else {
        setMessage({ ok: false, text: "Please drop a valid .csv file" });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await api.importCsv(file);
      setLoading(false);
      if (res.error) {
        setMessage({ ok: false, text: res.error });
      } else {
        setMessage({
          ok: true,
          text: `Successfully ingested ${res.added} records directly into Social Listening feed!`,
        });
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        onImportSuccess(res.added);
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ ok: false, text: err.message || "Failed to parse CSV file" });
    }
  };

  const handleLoadSample = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const resp = await fetch("/tata_strive_student_feedback.csv");
      if (!resp.ok) throw new Error("Could not fetch sample dataset");
      const blob = await resp.blob();
      const sampleFile = new File([blob], "tata_strive_student_feedback.csv", {
        type: "text/csv",
      });
      const res = await api.importCsv(sampleFile);
      setLoading(false);
      if (res.error) {
        setMessage({ ok: false, text: res.error });
      } else {
        setMessage({
          ok: true,
          text: `Loaded ${res.added} verified Tata STRIVE records into your feed!`,
        });
        onImportSuccess(res.added);
      }
    } catch (err: any) {
      setLoading(false);
      setMessage({ ok: false, text: err.message || "Failed to load sample dataset" });
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#0067A5]/30 shadow-md p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#DCEFF7] text-[#0067A5] flex items-center justify-center">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2">
              <span>Import CSV Directly to Social Listening</span>
              <span className="text-[10px] font-semibold bg-[#DCEFF7] text-[#0067A5] px-2 py-0.5 rounded-full">
                Instant Ingestion
              </span>
            </h3>
            <p className="text-[11px] text-[#666666]">
              Upload student reviews, center inquiry surveys, or social export spreadsheets
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#666666] hover:bg-gray-100 hover:text-[#252525] transition-colors"
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          isDragging
            ? "border-[#0067A5] bg-[#DCEFF7]/30"
            : "border-[#E5E7EB] hover:border-[#0067A5]/40 bg-[#F9FAFB]"
        }`}
      >
        <UploadCloud className="w-8 h-8 text-[#0067A5] mx-auto mb-2 opacity-80" />
        <p className="text-xs font-semibold text-[#252525]">
          {file ? file.name : "Drag and drop your CSV file here, or browse"}
        </p>
        <p className="text-[11px] text-[#666666] mt-0.5">
          Supported headers: <code className="text-[#0067A5] font-mono text-[10px]">content, author, platform, topic, sentiment, rating, date, url</code>
        </p>

        <div className="mt-3 flex items-center justify-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="csv-file-picker-feed"
          />
          <label
            htmlFor="csv-file-picker-feed"
            className="px-3.5 py-1.5 rounded-lg border border-[#0067A5]/40 bg-white text-[#0067A5] text-xs font-semibold hover:bg-[#DCEFF7] transition-colors cursor-pointer shadow-2xs"
          >
            {file ? "Change CSV File" : "Browse Computer"}
          </label>

          {file && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0067A5] text-white text-xs font-semibold hover:bg-[#005588] transition-colors shadow-2xs cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Ingesting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload &amp; Analyze</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions: Download Sample & 1-Click Load */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <a
            href="/tata_strive_student_feedback.csv"
            download="tata_strive_student_feedback.csv"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#252525] hover:bg-[#DCEFF7] hover:text-[#0067A5] hover:border-[#0067A5]/30 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#0067A5]" />
            <span>Download Sample CSV</span>
          </a>

          <button
            type="button"
            onClick={handleLoadSample}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer font-medium"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>1-Click Load 20 Sample Records</span>
          </button>
        </div>

        <span className="text-[11px] text-[#666666]">
          Real-time integration with all feed filters
        </span>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            message.ok
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.ok ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}
