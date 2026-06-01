"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ChevronLeft, Target, ListChecks } from "lucide-react";
import { officeSocialMediaTasks } from "@/lib/office-social-media-plan";
import { Button } from "@/components/ui/button";

const TURKISH_DAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
const TURKISH_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

function getTurkeyDate() {
  const nowTr = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const dayName = TURKISH_DAYS[nowTr.getUTCDay()];
  const day = nowTr.getUTCDate();
  const month = TURKISH_MONTHS[nowTr.getUTCMonth()];
  const dateKey = nowTr.toISOString().slice(0, 10);
  return { dayName, day, month, dateKey };
}

export default function DailyTasksPage() {
  const { dayName, day, month, dateKey } = getTurkeyDate();

  const todayTasks = officeSocialMediaTasks.filter(
    (t) => t.group === "weekly" && t.day === dayName
  );

  const storageKey = `daily-tasks-${dateKey}`;
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, [storageKey]);

  const toggle = (stepKey: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) next.delete(stepKey);
      else next.add(stepKey);
      try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  const allStepKeys = todayTasks.flatMap((t) =>
    t.steps.map((_, i) => `${t.id}-${i}`)
  );
  const doneCount = allStepKeys.filter((k) => completed.has(k)).length;

  const markAll = () => {
    const next = new Set(allStepKeys);
    setCompleted(next);
    try { localStorage.setItem(storageKey, JSON.stringify([...next])); } catch {}
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 pt-safe pb-6 shadow-lg">
        <div className="max-w-lg mx-auto">
          <Link href="/" className="inline-flex items-center text-indigo-200 hover:text-white text-sm mb-4">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Ana Sayfa
          </Link>
          <h1 className="text-2xl font-bold">{dayName}</h1>
          <p className="text-indigo-200 text-sm mt-0.5">{day} {month} · Günlük Görevler</p>
          {allStepKeys.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-white/20 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-white h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(doneCount / allStepKeys.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-indigo-200">{doneCount}/{allStepKeys.length}</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {todayTasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">Bugün ({dayName}) için planlanmış görev yok.</p>
            <p className="text-sm text-slate-400 mt-1">Haftalık görevler Pazartesi–Cuma ve Pazar için planlanmıştır.</p>
          </div>
        ) : (
          todayTasks.map((task) => (
            <div key={task.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
              {/* Task header */}
              <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-900/30 dark:to-purple-900/30 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-start gap-3">
                  <div className="bg-indigo-100 dark:bg-indigo-900/50 rounded-xl p-2 shrink-0 mt-0.5">
                    <Target className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-slate-900 dark:text-slate-100">{task.title}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.goal}</p>
                    <p className="text-xs font-medium text-indigo-500 mt-1">{task.timeLabel}</p>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                  <ListChecks className="h-3.5 w-3.5" />
                  Adımlar
                </div>
                {task.steps.map((step, i) => {
                  const key = `${task.id}-${i}`;
                  const done = completed.has(key);
                  return (
                    <button
                      key={key}
                      onClick={() => toggle(key)}
                      className="w-full flex items-start gap-3 text-left group"
                    >
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5 transition-colors" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300 shrink-0 mt-0.5 group-hover:text-indigo-300 transition-colors" />
                      )}
                      <span
                        className={`text-sm leading-relaxed transition-colors ${
                          done
                            ? "text-slate-400 line-through"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {step}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}

        {allStepKeys.length > 0 && doneCount < allStepKeys.length && (
          <Button
            onClick={markAll}
            variant="outline"
            className="w-full border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Tümünü Tamamlandı İşaretle
          </Button>
        )}

        {doneCount > 0 && doneCount === allStepKeys.length && (
          <div className="text-center py-4">
            <p className="text-indigo-600 dark:text-indigo-400 font-semibold">🎉 Harika! Günün tüm görevleri tamamlandı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
