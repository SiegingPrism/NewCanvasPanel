import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { CheckCircle2, Vote, Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/poll")({
  component: StudentPollPage,
});

function StudentPollPage() {
  const [params, setParams] = useState<{
    id: string;
    question: string;
    options: string[];
    correctIndex?: number;
  }>({
    id: "default",
    question: "Classroom Question",
    options: ["Option A", "Option B", "Option C", "Option D"],
  });

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id") || "default";
    const q = url.searchParams.get("q") || "Classroom Live Question";
    const rawOpts = url.searchParams.get("opts");
    let options = ["Option A", "Option B", "Option C", "Option D"];
    if (rawOpts) {
      try {
        options = JSON.parse(rawOpts);
      } catch {
        options = rawOpts.split(",").map((s) => s.trim());
      }
    }
    const ans = url.searchParams.get("ans");

    setParams({
      id,
      question: q,
      options,
      correctIndex: ans !== null ? parseInt(ans, 10) : undefined,
    });

    // Also attempt fetching latest poll state from backend server
    if (id && id !== "default") {
      fetch(`/api/poll?id=${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && data.question && Array.isArray(data.options)) {
            setParams((prev) => ({
              ...prev,
              question: data.question,
              options: data.options,
              correctIndex: data.correctIndex ?? prev.correctIndex,
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmitVote = async () => {
    if (selectedOption === null) return;

    // 1. Cross-device HTTP submission to Smart Board server API
    try {
      await fetch("/api/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "vote",
          pollId: params.id,
          optionIndex: selectedOption,
        }),
      });
    } catch (err) {
      console.warn("HTTP vote submission error:", err);
    }

    const votePayload = {
      type: "vote",
      pollId: params.id,
      optionIndex: selectedOption,
      timestamp: Date.now(),
    };

    // 2. BroadcastChannel for same-origin tabs/devices
    try {
      const bc = new BroadcastChannel(`slate_poll_${params.id}`);
      bc.postMessage(votePayload);
      bc.close();
    } catch {}

    // 3. Storage event for cross-window reactivity
    try {
      localStorage.setItem(`slate_poll_vote_${params.id}_${Date.now()}`, JSON.stringify(votePayload));
    } catch {}

    setHasVoted(true);
  };

  const optionColors = [
    "border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400",
    "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
    "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400",
    "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400",
  ];

  const optionLetters = ["A", "B", "C", "D", "E", "F"];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Vote className="h-5 w-5" />
            </div>
            <span className="font-bold tracking-tight text-white">Slate Live Poll</span>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 font-medium">
            Session: {params.id.slice(0, 8)}
          </span>
        </div>

        {hasVoted ? (
          <div className="text-center py-10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Vote Submitted!</h2>
            <p className="text-slate-400 text-sm max-w-xs mx-auto">
              Your response has been transmitted to the Smart Board. Look up to see the live class results!
            </p>
            <div className="pt-4">
              <Button
                variant="outline"
                className="rounded-full border-slate-700 text-slate-300 hover:bg-slate-800"
                onClick={() => setHasVoted(false)}
              >
                Change Answer
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Question</span>
              <h2 className="text-xl font-bold text-white leading-snug">{params.question}</h2>
            </div>

            <div className="space-y-3">
              {params.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                const letter = optionLetters[idx] || `${idx + 1}`;
                const colorClass = optionColors[idx % optionColors.length];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-600/20 text-white shadow-lg shadow-indigo-500/10 scale-[1.01]"
                        : `${colorClass}`
                    }`}
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        isSelected ? "bg-indigo-600 text-white" : "bg-slate-800/80 text-slate-200"
                      }`}
                    >
                      {letter}
                    </div>
                    <span className="font-semibold text-base flex-1">{opt}</span>
                    {isSelected && <CheckCircle2 className="h-5 w-5 text-indigo-400" />}
                  </button>
                );
              })}
            </div>

            <Button
              disabled={selectedOption === null}
              onClick={handleSubmitVote}
              className="w-full h-12 rounded-2xl text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Vote
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
