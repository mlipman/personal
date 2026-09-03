"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { parseLogContent } from "@/lib/log-content";
import { CalendarView } from "./calendar-view";

type LogRecord = { id: string; createdAt: string; context: string };
type ChatMessage = { role: "user" | "assistant"; content: string };
type Tab = "log" | "chat" | "calendar";

export function SimpleLog({ initialLogs, initialTab = "log" }: { initialLogs: LogRecord[]; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [logs, setLogs] = useState(initialLogs);
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const characterCount = useMemo(() => context.length, [context]);

  function selectTab(next: Tab) {
    setTab(next);
    const url = next === "log" ? "/" : `/?view=${next}`;
    window.history.replaceState(null, "", url);
  }

  async function addLog(event: FormEvent) {
    event.preventDefault();
    if (!context.trim()) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/logs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context }) });
      const body: unknown = await response.json();
      if (!response.ok || !isLog(body)) throw new Error(readError(body));
      setLogs((current) => [body, ...current]); setContext("");
    } catch (caught) { setError(messageOf(caught)); } finally { setBusy(false); }
  }

  async function uploadImage(file: File) {
    setBusy(true); setError(null);
    try {
      const materialized = await materializeImageFile(file);
      const data = new FormData(); data.append("file", materialized);
      const response = await fetch("/api/images", { method: "POST", body: data });
      const body = await readJsonBody(response);
      if (!response.ok || !isImageResponse(body)) throw new Error(readImageError(body));
      const alt = materialized.name.replace(/\.[^.]+$/, "") || "image";
      setContext((current) => `${current}${current && !current.endsWith("\n") ? "\n" : ""}![${alt}](${body.url})\n`);
    } catch (caught) { setError(imageUploadMessage(caught)); } finally { setBusy(false); if (fileInput.current) fileInput.current.value = ""; }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const prompt = question.trim(); if (!prompt) return;
    const next = [...messages, { role: "user", content: prompt } satisfies ChatMessage];
    setMessages(next); setQuestion(""); setBusy(true); setError(null);
    try {
      const response = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      const body: unknown = await response.json();
      if (!response.ok || !isChatResponse(body)) throw new Error(readError(body));
      setMessages((current) => [...current, { role: "assistant", content: body.message }]);
    } catch (caught) { setError(messageOf(caught)); } finally { setBusy(false); }
  }

  return <main>
    <header><Link className="brand" href="/"><span className="mark">s_l</span><span>simple_log</span></Link><nav aria-label="Primary"><button className={tab === "log" ? "active" : ""} onClick={() => selectTab("log")}>Log</button><button className={tab === "chat" ? "active" : ""} onClick={() => selectTab("chat")}>Chat</button><button className={tab === "calendar" ? "active" : ""} onClick={() => selectTab("calendar")}>Calendar</button></nav><span className="status"><i /> private space</span></header>
    {tab === "calendar" ? <CalendarView logs={logs} /> : tab === "log" ? <section className="workspace">
      <div className="intro"><p className="eyebrow">YOUR RUNNING MEMORY</p><h1>What happened?</h1><p>Write it down while it’s fresh. Add an image if it helps.</p></div>
      <form className="composer" onSubmit={addLog}><textarea autoFocus value={context} onChange={(e) => setContext(e.target.value)} onKeyDown={(event) => { if (event.metaKey && event.key === "Enter" && !busy && context.trim()) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="A thought, an observation, something worth remembering…" maxLength={100000} /><div className="composer-footer"><div><input ref={fileInput} hidden type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadImage(file); }} /><button type="button" className="attach" onClick={() => fileInput.current?.click()} disabled={busy}>＋ Image</button><span>{characterCount.toLocaleString()} chars</span></div><button className="primary" disabled={busy || !context.trim()}>{busy ? "Saving…" : "Add to log →"}</button></div></form>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="timeline"><div className="timeline-title"><h2>Recent</h2><span>{logs.length} {logs.length === 1 ? "entry" : "entries"}</span></div>{logs.length === 0 ? <div className="empty">Your log is quiet. Add the first entry above.</div> : logs.map((log) => <article className="entry" key={log.id}><time>{formatDate(log.createdAt)}</time><div className="entry-body">{parseLogContent(log.context).map((part, index) => part.type === "text" ? <p key={index}>{part.value}</p> : <img key={index} src={part.url} alt={part.alt} />)}</div></article>)}</div>
    </section> : <section className="chat-shell"><div className="intro"><p className="eyebrow">CHAT WITH YOUR MEMORY</p><h1>Ask your logs.</h1><p>{logs.length ? `Using the text from ${logs.length} ${logs.length === 1 ? "entry" : "entries"}. Images stay private and are excluded.` : "Add a log first, then ask anything about it."}</p></div><div className="chat-card"><div className="messages">{messages.length === 0 ? <div className="chat-empty"><span>✦</span><strong>What would you like to recall?</strong><p>Try “What did I work on recently?”</p></div> : messages.map((message, index) => <div key={index} className={`message ${message.role}`}>{message.role === "assistant" ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown> : message.content}</div>)}</div><form className="chat-form" onSubmit={sendMessage}><textarea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(event) => { if (event.metaKey && event.key === "Enter" && !busy && question.trim() && logs.length > 0) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask about your logs…" rows={2} /><button className="primary" disabled={busy || !question.trim() || logs.length === 0}>{busy ? "Thinking…" : "Send ↑"}</button></form></div>{error && <p className="error" role="alert">{error}</p>}</section>}
  </main>;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
function isLog(value: unknown): value is LogRecord { return isRecord(value) && typeof value.id === "string" && typeof value.createdAt === "string" && typeof value.context === "string"; }
function isImageResponse(value: unknown): value is { url: string } { return isRecord(value) && typeof value.url === "string"; }
function isChatResponse(value: unknown): value is { message: string } { return isRecord(value) && typeof value.message === "string"; }
function readError(value: unknown): string { return isRecord(value) && typeof value.error === "string" ? value.error : "Something went wrong."; }
function messageOf(value: unknown): string { return value instanceof Error ? value.message : "Something went wrong."; }
function formatDate(value: string): string { return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

async function materializeImageFile(file: File): Promise<File> {
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength === 0) throw new Error("That photo looks empty. Try another photo, or take a picture.");
  return new File([bytes], file.name || "image", { type: file.type, lastModified: file.lastModified });
}

async function readJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try { return JSON.parse(text) as unknown; } catch { return null; }
}

function readImageError(value: unknown): string {
  return isRecord(value) && typeof value.error === "string" && value.error.trim() ? value.error : "Image upload failed. Try again, or take a picture.";
}

function imageUploadMessage(value: unknown): string {
  if (!(value instanceof Error) || !value.message) return "Image upload failed. Try again, or take a picture.";
  if (value.name === "SyntaxError" || value.message === "The string did not match the expected pattern.") {
    return "Image upload failed. Try again, or take a picture.";
  }
  return value.message;
}
