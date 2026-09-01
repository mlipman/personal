import { prisma } from "@/lib/prisma";
import { SimpleLog } from "./simple-log";

export const dynamic = "force-dynamic";

type Tab = "log" | "chat" | "calendar";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const logs = await prisma.log.findMany({ orderBy: { createdAt: "desc" } });
  return <SimpleLog initialLogs={logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))} initialTab={tabFromView(view)} />;
}

function tabFromView(view: string | undefined): Tab {
  if (view === "calendar" || view === "chat") return view;
  return "log";
}
