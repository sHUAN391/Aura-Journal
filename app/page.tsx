"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CopilotKit, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import {
  CloudRain,
  Droplets,
  Flame,
  Heart,
  History,
  Mountain,
  PenTool,
  Send,
  Sparkles,
  WandSparkles,
  Wind,
  type LucideIcon,
} from "lucide-react";

const STORAGE_KEYS = {
  profile: "aura-journal-profile",
  logs: "aura-journal-logs",
  reflections: "aura-journal-reflections",
};

type ElementName = "Metal" | "Wood" | "Water" | "Fire" | "Earth";
type JournalStatus = "calm" | "strained" | "heavy" | "recovering";

type ElementScore = { name: ElementName; value: number; note: string };
type UserProfile = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  elements: ElementScore[];
  createdAt: string;
};

type JournalEntry = {
  id: string;
  timestamp: string;
  type: "venting" | "reflection";
  input: string;
  response: string;
  status: JournalStatus;
};

type ReflectionEntry = {
  id: string;
  timestamp: string;
  questions: string[];
  answers: string[];
  summary: string;
};

type HealingImage = {
  imageUrl: string;
  prompt: string;
  provider: string;
};

type ElementTheme = { bg: string; border: string; icon: LucideIcon; text: string; soft: string; ink: string };

const elements: Array<{ name: ElementName; note: string }> = [
  { name: "Metal", note: "clarity, structure" },
  { name: "Wood", note: "growth, renewal" },
  { name: "Water", note: "adaptation, flow" },
  { name: "Fire", note: "drive, visibility" },
  { name: "Earth", note: "stability, grounding" },
];

const themes: Record<ElementName, ElementTheme> = {
  Wood: { bg: "bg-emerald-50", border: "border-emerald-300", icon: Wind, text: "text-emerald-900", soft: "bg-emerald-100", ink: "bg-emerald-600" },
  Fire: { bg: "bg-orange-50", border: "border-orange-300", icon: Flame, text: "text-orange-900", soft: "bg-orange-100", ink: "bg-orange-600" },
  Earth: { bg: "bg-yellow-50", border: "border-yellow-300", icon: Mountain, text: "text-stone-900", soft: "bg-yellow-100", ink: "bg-yellow-600" },
  Metal: { bg: "bg-stone-50", border: "border-stone-300", icon: Sparkles, text: "text-stone-900", soft: "bg-stone-100", ink: "bg-stone-600" },
  Water: { bg: "bg-sky-50", border: "border-sky-300", icon: Droplets, text: "text-sky-900", soft: "bg-sky-100", ink: "bg-sky-600" },
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

function saveJson(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function persistLocalOnly() {
  // Data is intentionally stored in localStorage for the current prototype.
}

function computeElements(name: string, birthDate: string, birthTime: string, birthLocation: string): ElementScore[] {
  const seed = `${name}-${birthDate}-${birthTime}-${birthLocation}`;
  const hash = [...seed].reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return elements.map((element, index) => ({ name: element.name, note: element.note, value: 28 + ((hash + index * 19) % 53) }));
}

function dominantElement(profile: UserProfile | null): ElementName {
  if (!profile?.elements.length) return "Water";
  return [...profile.elements].sort((a, b) => b.value - a.value)[0].name;
}

function getQuestions(profile: UserProfile, status: JournalStatus) {
  const dominant = dominantElement(profile);
  const map = {
    calm: [
      `今天最能滋养你 ${dominant} 能量的事情是什么？`,
      `今天什么给了你稳定感，哪怕只有一点点？`,
      `你今天最想守住的边界是什么？`,
    ],
    strained: [
      `今天是什么最容易让你的 ${dominant} 能量失衡？`,
      `今天你最需要放下的压力来源是什么？`,
      `如果只保留一件事，你想先保护什么？`,
    ],
    heavy: [
      `今天压在你身上的主要感受是什么？`,
      `今天哪个时刻让你最想停下来呼吸？`,
      `如果给今天一个缓冲动作，它会是什么？`,
    ],
    recovering: [
      `今天什么正在把你慢慢拉回平衡？`,
      `今天你做对了哪件小事？`,
      `明天你想延续的一个节奏是什么？`,
    ],
  };
  return map[status];
}

function detectStatus(text: string): JournalStatus {
  const keywords = ["烦", "累", "压", "忙", "崩", "怒", "焦虑", "难受", "委屈"];
  const score = keywords.reduce((acc, word) => acc + (text.includes(word) ? 20 : 0), Math.min(100, text.length));
  if (score < 25) return "calm";
  if (score < 50) return "strained";
  if (score < 75) return "heavy";
  return "recovering";
}

function formatTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  return {
    date: date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
    time: date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
  };
}

function SketchyCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className={`relative rounded-[15px_60px_20px_45px] border-[1.5px] p-8 shadow-[4px_6px_0px_rgba(0,0,0,0.1)] backdrop-blur-sm transition-all ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SketchyRain() {
  const drops = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => ({
        id: index,
        left: `${(index * 37) % 100}%`,
        duration: 2 + ((index * 13) % 30) / 10,
        delay: ((index * 11) % 50) / 10,
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
      {drops.map((drop) => (
        <motion.div
          key={drop.id}
          className="absolute h-[2px] w-[2px] rounded-full bg-blue-400"
          style={{ left: drop.left }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: ["0vh", "100vh"], opacity: [0, 1, 0] }}
          transition={{ duration: drop.duration, repeat: Infinity, delay: drop.delay, ease: "linear" }}
        />
      ))}
    </div>
  );
}

function useAuraData() {
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<JournalEntry[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);

  useEffect(() => {
    setProfile(readJson<UserProfile | null>(STORAGE_KEYS.profile, null));
    setLogs(readJson<JournalEntry[]>(STORAGE_KEYS.logs, []));
    setReflections(readJson<ReflectionEntry[]>(STORAGE_KEYS.reflections, []));
    setMounted(true);
  }, []);

  return { mounted, profile, setProfile, logs, setLogs, reflections, setReflections };
}

function AppShell() {
  const { mounted, profile, setProfile, logs, setLogs, reflections, setReflections } = useAuraData();
  const [view, setView] = useState<"home" | "vent" | "reflection" | "history">("home");
  const [healingImage, setHealingImage] = useState<HealingImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const theme = themes[dominantElement(profile)];
  const ActiveIcon = theme.icon;

  useCopilotReadable({
    description: "Aura Journal user state",
    value: profile ? { profile, dominantElement: dominantElement(profile), recentLogs: logs.slice(0, 5), reflections: reflections.slice(0, 3) } : { profile: null },
  });

  useCopilotAction({
    name: "add_journal_entry",
    description: "Persist a journal entry",
    parameters: [
      { name: "type", type: "string", required: true },
      { name: "input", type: "string", required: true },
      { name: "response", type: "string", required: true },
      { name: "status", type: "string", required: true },
    ],
    handler: async (args: { type: string; input: string; response: string; status: string }) => {
      const entry: JournalEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: args.type === "reflection" ? "reflection" : "venting",
        input: args.input,
        response: args.response,
        status: (args.status as JournalStatus) || "calm",
      };
      setLogs((current) => {
        const next = [entry, ...current].slice(0, 50);
        saveJson(STORAGE_KEYS.logs, next);
        return next;
      });
      return entry;
    },
  });

  useCopilotAction({
    name: "generate_healing_image",
    description: "Generate a calming healing image from venting text and the user's aura profile",
    parameters: [{ name: "ventText", type: "string", required: true }],
    handler: async ({ ventText }: { ventText: string }) => {
      const image = await generateHealingImage(ventText, profile, detectStatus(ventText));
      setHealingImage(image);
      setView("vent");
      return image;
    },
  });

  if (!mounted) return null;

  const createProfile = (input: Omit<UserProfile, "elements" | "createdAt">) => {
    const saved: UserProfile = { ...input, elements: computeElements(input.name, input.birthDate, input.birthTime, input.birthLocation), createdAt: new Date().toISOString() };
    setProfile(saved);
    saveJson(STORAGE_KEYS.profile, saved);
    persistLocalOnly();
    setView("home");
  };

  const createHealingImage = async (text: string) => {
    if (!text.trim()) return null;
    setImageLoading(true);
    try {
      const image = await generateHealingImage(text, profile, detectStatus(text));
      setHealingImage(image);
      return image;
    } finally {
      setImageLoading(false);
    }
  };

  const addVent = async (text: string) => {
    const status = detectStatus(text);
    const response = await generateAIResponse("vent", { profile, text, status });
    const entry: JournalEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), type: "venting", input: text, response, status };
    const next = [entry, ...logs].slice(0, 50);
    setLogs(next);
    saveJson(STORAGE_KEYS.logs, next);
    persistLocalOnly();
    setView("history");
  };

  const addReflection = async (questions: string[], answers: string[]) => {
    const summary = await generateAIResponse("reflection", { profile, questions, answers, status: detectStatus(answers.join(" ")) });
    const entry: ReflectionEntry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), questions, answers, summary };
    const next = [entry, ...reflections].slice(0, 50);
    setReflections(next);
    saveJson(STORAGE_KEYS.reflections, next);
    persistLocalOnly();
    const logEntry: JournalEntry = { id: crypto.randomUUID(), timestamp: entry.timestamp, type: "reflection", input: answers.join(" \n"), response: summary, status: detectStatus(answers.join(" ")) };
    const nextLogs = [logEntry, ...logs].slice(0, 50);
    setLogs(nextLogs);
    saveJson(STORAGE_KEYS.logs, nextLogs);
    persistLocalOnly();
    setView("history");
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f4f1ea] font-serif text-[#333] selection:bg-orange-200">
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.08] [background-image:url('https://www.transparenttextures.com/patterns/natural-paper.png')]" />
      <SketchyRain />
      <main className="relative z-10 mx-auto max-w-4xl px-8 py-16">
        <header className="mb-16 flex justify-between items-end border-b border-stone-300 pb-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-4xl font-light tracking-tight italic text-stone-700">Aura Journal <span className="text-xs opacity-40 font-sans uppercase tracking-widest ml-4">Spiritus Diary</span></h1>
            <p className="text-sm text-stone-500 mt-1 italic">
              {profile ? `Welcome back, ${profile.name}. The energy is flowing.` : "A quiet paper ritual for pressure, clarity, and elemental balance."}
            </p>
          </motion.div>
          {profile && (
            <div className="flex gap-6 text-sm items-center font-sans">
              {(["home", "vent", "reflection", "history"] as const).map((item) => (
                <button key={item} onClick={() => setView(item)} className={`hover:underline underline-offset-4 ${view === item ? "font-bold underline" : "opacity-60"}`}>
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
              <div className={`w-3 h-3 rounded-full ${theme.ink}`} />
            </div>
          )}
        </header>

        <AnimatePresence mode="wait">
          {!profile ? (
            <motion.section key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Onboarding onSubmit={createProfile} />
            </motion.section>
          ) : view === "home" ? (
            <motion.section key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <SketchyCard className={`${theme.bg} ${theme.border}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${theme.soft}`}><ActiveIcon className={theme.text} size={22} /></div>
                  <div>
                    <h2 className="text-xl font-semibold">{dominantElement(profile)} Soul</h2>
                    <p className="text-sm text-stone-500">Your strongest elemental current</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {profile.elements.map((element) => (
                    <div key={element.name}>
                      <div className="mb-1 flex justify-between text-xs uppercase tracking-wide text-stone-500"><span>{element.name}</span><span>{element.value}%</span></div>
                      <div className="h-2 rounded-full bg-white"><div className={`h-2 rounded-full ${themes[element.name].ink}`} style={{ width: `${element.value}%` }} /></div>
                    </div>
                  ))}
                </div>
              </SketchyCard>
              <SketchyCard>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><History size={18} /> Recent activity</h2>
                <div className="space-y-4">
                  {logs.length === 0 ? <p className="text-sm text-stone-500">No entries yet.</p> : logs.slice(0, 4).map((log) => {
                    const t = formatTimestamp(log.timestamp);
                    return <div key={log.id} className="border-b border-stone-100 pb-3"><p className="text-xs text-stone-400">{t.date} {t.time} · {log.type} · {log.status}</p><p className="text-sm">{log.input}</p><p className="text-xs text-stone-500">{log.response}</p></div>;
                  })}
                </div>
              </SketchyCard>
            </motion.section>
          ) : view === "vent" ? (
            <VentingPanel profile={profile} onCreate={addVent} onGenerateImage={createHealingImage} healingImage={healingImage} imageLoading={imageLoading} />
          ) : view === "reflection" ? (
            <ReflectionPanel profile={profile} onSave={addReflection} />
          ) : (
            <HistoryPanel logs={logs} reflections={reflections} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function Onboarding({ onSubmit }: { onSubmit: (profile: Omit<UserProfile, "elements" | "createdAt">) => void }) {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthLocation, setBirthLocation] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ name, birthDate, birthTime, birthLocation });
  };

  return (
    <SketchyCard className="border-stone-400 bg-white/40">
      <div className="mb-8 flex items-center gap-3 text-stone-500"><CloudRain size={18} /><span className="font-sans text-xs uppercase tracking-[0.3em] opacity-60">Initialization</span></div>
      <h2 className="mb-8 text-2xl font-bold italic">Begin your journey...</h2>
      <form onSubmit={submit} className="space-y-5">
        <Field label="Name" value={name} onChange={setName} required />
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Birth date" value={birthDate} onChange={setBirthDate} type="date" required />
          <Field label="Birth time (optional)" value={birthTime} onChange={setBirthTime} type="time" />
          <Field label="Birth place" value={birthLocation} onChange={setBirthLocation} placeholder="City, Country" required />
        </div>
        <button className="mt-8 w-full rounded-full border border-stone-800 py-6 font-sans text-xs uppercase tracking-[0.3em] transition-all hover:bg-stone-800 hover:text-white active:scale-95">Reveal My Aura</button>
      </form>
    </SketchyCard>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs uppercase tracking-widest text-stone-500">{label}</span>
      <input type={type} value={value} placeholder={placeholder} required={required} onChange={(e) => onChange(e.target.value)} className="w-full border-b border-stone-400 bg-transparent p-2 text-lg font-light italic outline-none transition-colors placeholder:opacity-25 focus:border-stone-800" />
    </label>
  );
}

function VentingPanel({
  profile,
  onCreate,
  onGenerateImage,
  healingImage,
  imageLoading,
}: {
  profile: UserProfile;
  onCreate: (input: string) => void;
  onGenerateImage: (input: string) => Promise<HealingImage | null>;
  healingImage: HealingImage | null;
  imageLoading: boolean;
}) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-8">
      <SketchyCard className="flex min-h-[400px] max-w-3xl flex-col border-dashed border-stone-400 bg-white/60">
        <div className="flex-1">
          <h2 className="mb-3 text-2xl font-bold italic">Venting</h2>
          <p className="mb-5 text-sm italic text-stone-500">Write freely. I will turn it into guidance and a quiet healing image based on your profile.</p>
          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Scream into the paper... What is weighing on ${profile.name}'s soul today?`}
            className="h-64 w-full resize-none bg-transparent text-2xl font-light italic leading-loose outline-none placeholder:opacity-20"
          />
        </div>
        <div className="mt-8 flex flex-col gap-4 border-t border-stone-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs italic opacity-40">Your words can become a memory, a guide, and a symbolic image.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => text.trim() && onGenerateImage(text)}
              disabled={imageLoading || !text.trim()}
              className="inline-flex items-center gap-2 rounded-full border border-stone-800 px-6 py-3 font-sans text-xs uppercase tracking-widest transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Sparkles size={14} /> {imageLoading ? "Drawing..." : "Generate Healing Image"}
            </button>
            <button onClick={() => text.trim() && onCreate(text)} className="inline-flex items-center gap-2 rounded-full bg-stone-800 px-8 py-3 text-sm text-white transition-transform hover:-translate-y-0.5 active:scale-95">
              Release <Send size={14} />
            </button>
          </div>
        </div>
      </SketchyCard>

      {healingImage && (
        <SketchyCard className="max-w-3xl border-stone-300 bg-white/50">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold italic">Healing Image</h3>
              <p className="font-sans text-xs uppercase tracking-widest opacity-40">Provider: {healingImage.provider}</p>
            </div>
          </div>
          <img src={healingImage.imageUrl} alt="Generated healing image" className="aspect-square w-full rounded-[20px_45px_18px_36px] border border-stone-300 object-cover" />
          <details className="mt-5 text-xs leading-relaxed text-stone-500">
            <summary className="cursor-pointer font-sans uppercase tracking-widest text-stone-400">Image prompt</summary>
            <p className="mt-3 italic">{healingImage.prompt}</p>
          </details>
        </SketchyCard>
      )}
    </div>
  );
}

function ReflectionPanel({ profile, onSave }: { profile: UserProfile; onSave: (questions: string[], answers: string[]) => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [questions, setQuestions] = useState<string[]>([]);
  const status = useMemo(() => detectStatus(profile.name + profile.birthLocation), [profile]);

  useEffect(() => {
    setQuestions(getQuestions(profile, status));
  }, [profile, status]);

  return (
    <SketchyCard className="max-w-3xl">
      <div className="mb-3 flex items-center gap-2 text-stone-500"><WandSparkles size={16} /><span className="text-xs uppercase tracking-[0.3em]">Daily reflection</span></div>
      <h2 className="mb-6 text-2xl font-semibold">Three personalized questions</h2>
      <div className="space-y-5">
        {questions.map((question, index) => (
          <motion.label key={question} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.18 }} className="block">
            <span className="mb-2 block text-sm text-stone-600">{question}</span>
            <input value={answers[index] ?? ""} onChange={(e) => setAnswers({ ...answers, [index]: e.target.value })} className="w-full border-b border-stone-300 bg-transparent py-2 outline-none" />
          </motion.label>
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <button onClick={() => onSave(questions, questions.map((_, i) => answers[i] ?? ""))} className="rounded-full bg-stone-900 px-5 py-3 text-sm text-white">Seal Daily Reflection</button>
      </div>
    </SketchyCard>
  );
}

function HistoryPanel({ logs, reflections }: { logs: JournalEntry[]; reflections: ReflectionEntry[] }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <SketchyCard>
        <h2 className="mb-4 text-lg font-semibold">Venting history</h2>
        <div className="space-y-4">{logs.map((log) => {
          const t = formatTimestamp(log.timestamp);
          return <div key={log.id} className="border-b border-stone-100 pb-3"><p className="text-xs text-stone-400">{t.date} {t.time} · {log.status}</p><p className="text-sm">{log.input}</p><p className="text-xs text-stone-500">{log.response}</p></div>;
        })}</div>
      </SketchyCard>
      <SketchyCard>
        <h2 className="mb-4 text-lg font-semibold">Reflection history</h2>
        <div className="space-y-4">{reflections.map((item) => {
          const t = formatTimestamp(item.timestamp);
          return <div key={item.id} className="border-b border-stone-100 pb-3"><p className="text-xs text-stone-400">{t.date} {t.time}</p><p className="text-sm text-stone-600">{item.summary}</p></div>;
        })}</div>
      </SketchyCard>
    </div>
  );
}

async function generateAIResponse(kind: "vent" | "reflection", payload: { profile: UserProfile | null; text?: string; questions?: string[]; answers?: string[]; status: JournalStatus }) {
  try {
    const response = await fetch("/api/aura-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, ...payload }),
    });
    if (response.ok) {
      const data = (await response.json()) as { text?: string; summary?: string };
      return data.text ?? data.summary ?? "";
    }
  } catch {}
  if (kind === "vent") return `Your ${payload.status} energy is asking for one small reset. The situation feels real, but the next move can be simple: name the pressure, reduce the scope, and protect one boundary.`;
  return `Today your answers point toward steadying your ${payload.status} state by making the next action smaller, gentler, and repeatable.`;
}

async function generateHealingImage(ventText: string, profile: UserProfile | null, status: JournalStatus): Promise<HealingImage> {
  const response = await fetch("/api/generate-healing-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ventText, profile, status }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate healing image");
  }

  return (await response.json()) as HealingImage;
}

export default function Home() {
  return (
    <CopilotKit publicApiKey={process.env.NEXT_PUBLIC_COPILOTKIT_PUBLIC_API_KEY}>
      <AppShell />
    </CopilotKit>
  );
}
