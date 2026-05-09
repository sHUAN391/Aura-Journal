import { NextResponse } from "next/server";

type JournalStatus = "calm" | "strained" | "heavy" | "recovering";

type UserProfile = {
  name: string;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  elements: Array<{ name: string; value: number; note: string }>;
  createdAt: string;
};

function dominantElement(profile: UserProfile | null) {
  if (!profile?.elements?.length) return "Water";
  return [...profile.elements].sort((a, b) => b.value - a.value)[0].name;
}

function localTimeLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZoneName: "short",
  }).format(new Date());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      kind: "vent" | "reflection";
      profile: UserProfile | null;
      text?: string;
      questions?: string[];
      answers?: string[];
      status: JournalStatus;
    };

    const name = body.profile?.name ?? "you";
    const dominant = dominantElement(body.profile);
    const timeLabel = localTimeLabel();

    if (body.kind === "vent") {
      const input = body.text ?? "";
      return NextResponse.json({
        text: `At ${timeLabel}, ${name}, your ${dominant} energy is responding to this pressure. What you wrote sounds heavy, but it is workable: first reduce the scope, then restore one boundary, then do one tiny action that protects your next hour.`,
      });
    }

    const answers = body.answers ?? [];
    return NextResponse.json({
      summary: `At ${timeLabel}, ${name} is in a ${body.status} state. The reflection suggests ${dominant} energy is most active, and the safest next step is to preserve the smallest repeatable habit while reducing friction in the area that feels most unfinished.`,
      questions: body.questions ?? [],
      answers,
    });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
