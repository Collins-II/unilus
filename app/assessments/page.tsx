"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { campusName } from "@/lib/campus-geography";

type Assessment = {
  id: string; title: string; kind: string; mode: string; campus: string; room: string | null;
  startTime: string; endTime: string; durationMinutes: number; instructions: string;
  questions: { prompt: string; options: string[]; points: number }[];
  attempt: { deadline: string; submittedAt: string | null; answers: number[]; score?: number; maximum?: number } | null;
};
type ResponseData = { assessments: Assessment[]; serverTime: string; error?: string };
const time = (value: string) => new Date(value).toLocaleString("en-GB", { timeZone: "Africa/Lusaka" });

export default function AssessmentsPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const offset = useRef(0);
  const requestId = useRef(0);
  const load = useCallback(async (body?: Record<string, unknown>) => {
    const id = ++requestId.current;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/assessments", body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" });
      const result: ResponseData = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load assessments.");
      if (!Array.isArray(result.assessments) || !Number.isFinite(Date.parse(result.serverTime))) throw new Error("Invalid assessment service response.");
      if (requestId.current !== id) return;
      offset.current = Date.parse(result.serverTime) - Date.now();
      setNow(Date.now() + offset.current); setData(result);
    } catch (error) { if (requestId.current === id) setError(error instanceof Error ? error.message : "Unable to load assessments."); }
    finally { if (requestId.current === id) setBusy(false); }
  }, []);
  useEffect(() => {
    const requests = requestId;
    void load();
    const timer = setInterval(() => setNow(Date.now() + offset.current), 1000);
    const visible = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", visible); requests.current++; };
  }, [load]);
  return <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
    <header><h1 className="text-3xl font-bold">Quizzes, tests & exams</h1><p className="mt-2 text-slate-600">Your administrator-assigned programme and year determine available assessments. All times are Africa/Lusaka.</p></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</p>}
    <button className="ui-button" disabled={busy} onClick={() => void load()}>{busy ? "Loading..." : "Refresh assessments"}</button>
    {data?.assessments.length === 0 && <p>No published assessments for your programme and year. Contact campus staff if your academic assignment is missing.</p>}
    {data?.assessments.map((assessment) => {
      const attempt = assessment.attempt;
      const remaining = attempt ? Math.max(0, Math.ceil((Date.parse(attempt.deadline) - now) / 1000)) : 0;
      const open = now >= Date.parse(assessment.startTime) && now < Date.parse(assessment.endTime);
      return <article key={assessment.id} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold">{assessment.title}</h2>
        <p className="text-sm text-slate-600">{assessment.kind} / {assessment.mode === "online" ? "Online" : "In person"} / {campusName(assessment.campus)}<br />{time(assessment.startTime)} - {time(assessment.endTime)}</p>
        <p className="whitespace-pre-wrap">{assessment.instructions}</p>
        {assessment.room && <Link className="text-emerald-700 underline" href={`/navigation?id=${encodeURIComponent(assessment.room)}`}>Find assessment room</Link>}
        {assessment.mode === "online" && !attempt && <button className="ui-button" disabled={busy || !open} onClick={() => void load({ action: "start", assessmentId: assessment.id })}>Start single attempt ({assessment.durationMinutes} minutes)</button>}
        {attempt && <p role="status" className="font-semibold">{attempt.submittedAt ? attempt.score !== undefined ? `Result: ${attempt.score}/${attempt.maximum}` : "Submitted. Your result will be released when the assessment window closes." : remaining ? `Time remaining: ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}` : "Time has ended. Refresh to finalize your saved answers."}</p>}
        {attempt && !attempt.submittedAt && remaining > 0 && <div className="space-y-5">
          <p className="text-sm text-slate-500">Each selected answer is saved to the server. Wait for saving to finish before continuing. Unanswered questions receive zero points; saved answers are marked if time expires.</p>
          {assessment.questions.map((question, index) => <fieldset key={index} disabled={busy} className="rounded-xl border p-4">
            <legend className="font-semibold">{index + 1}. {question.prompt} ({question.points} points)</legend>
            {question.options.map((option, optionIndex) => <label key={optionIndex} className="flex cursor-pointer items-start gap-3 rounded-lg p-3 hover:bg-emerald-50"><input className="mt-1" type="radio" name={`${assessment.id}-${index}`} checked={attempt.answers[index] === optionIndex} onChange={() => void load({ action: "answer", assessmentId: assessment.id, question: index, option: optionIndex })} /><span>{option}</span></label>)}
          </fieldset>)}
          <button className="ui-button" disabled={busy} onClick={() => void load({ action: "submit", assessmentId: assessment.id })}>Submit final answers (cannot be changed)</button>
        </div>}
      </article>;
    })}
  </div>;
}
