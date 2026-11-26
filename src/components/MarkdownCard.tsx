import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, Play, RotateCw, ShieldCheck, X } from 'lucide-react';
import { AGENTS } from '../constants/agents';
import { ENGINE_META } from '../constants/engines';
import type { AgentId, EngineId } from '../types';

interface MarkdownCardProps {
  agentId: AgentId;
  title?: string;
  content: string;
  createdAt?: string;
  isDemo?: boolean;
  engineId?: EngineId;
  modelUsed?: string;
  compact?: boolean;
  showDownload?: boolean;
}

function extractHtmlPreviewCode(markdown: string): string | null {
  const htmlMatch = markdown.match(/```html\s*([\s\S]*?)```/i);
  if (htmlMatch?.[1]?.trim()) {
    return htmlMatch[1].trim();
  }
  const anyBlocks = markdown.matchAll(/```[\w-]*\s*([\s\S]*?)```/gi);
  for (const match of anyBlocks) {
    const code = match[1]?.trim() ?? '';
    if (/<!doctype\s+html|<html[\s>]/i.test(code)) {
      return code;
    }
  }
  return null;
}

export function MarkdownCard({
  agentId,
  title,
  content,
  createdAt,
  isDemo,
  engineId,
  modelUsed,
  compact = false,
  showDownload = false,
}: MarkdownCardProps) {
  const [copied, setCopied] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTick, setPreviewTick] = useState(0);

  const agent = AGENTS[agentId];
  const engine = engineId ? ENGINE_META[engineId] : null;
  const htmlCode = extractHtmlPreviewCode(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = document.createElement('textarea');
      el.value = content;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${agent.id}-cikti-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <article
        className={`rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
          compact ? 'p-3' : 'p-4'
        }`}
        style={{ borderColor: agent.borderColor }}
      >
        <header className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[11px] font-extrabold text-white shadow-xs"
              style={{ backgroundColor: agent.color }}
            >
              {agent.name.slice(0, 2).toUpperCase()}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">{agent.name}</span>
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                  style={{ backgroundColor: agent.lightBg, color: agent.accentColor }}
                >
                  {agent.shortRole}
                </span>
                {engine && (
                  <span
                    className="rounded-md border px-1.5 py-0.5 text-[10px] font-bold"
                    style={{
                      backgroundColor: engine.lightBg,
                      color: engine.accentColor,
                      borderColor: engine.borderColor,
                    }}
                    title={modelUsed || engine.name}
                  >
                    {engine.badgeSymbol} {engine.shortName}
                  </span>
                )}
                {isDemo && (
                  <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                    Demo
                  </span>
                )}
              </div>
              {title && (
                <p className="text-[11px] font-medium text-slate-500">{title}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {createdAt && (
              <span className="text-[10px] font-medium text-slate-400">
                {new Date(createdAt).toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            {htmlCode && (
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 transition hover:bg-emerald-100"
                title="Üretilen HTML kodunu korumalı sandbox içinde canlı önizle"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Canlı Önizle</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
              title="Markdown çıktısını kopyala"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Kopyalandı</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Kopyala</span>
                </>
              )}
            </button>
            {showDownload && (
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                title="Markdown (.md) olarak indir"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </header>

        <div className="markdown-body overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      </article>

      {/* Interactive Sandboxed Live HTML Preview Modal */}
      {previewOpen && htmlCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 p-3 backdrop-blur-xs sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="Canlı HTML Önizleme"
          onClick={() => setPreviewOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Play className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-extrabold text-slate-900">Canlı HTML Önizleme</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Siberci Korumalı Sandbox
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPreviewTick((prev) => prev + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Yenile
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewOpen(false)}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <X className="h-3.5 w-3.5" />
                  Kapat
                </button>
              </div>
            </div>
            <iframe
              key={previewTick}
              title="Canlı HTML Önizleme"
              srcDoc={htmlCode}
              sandbox="allow-scripts"
              className="h-full w-full flex-1 bg-white"
            />
          </div>
        </div>
      )}
    </>
  );
}
