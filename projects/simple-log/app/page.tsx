import { parseChicagoSince, SINCE_CT_PARAM } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import { SimpleLog } from "./simple-log";

export const dynamic = "force-dynamic";

type Tab = "log" | "chat" | "calendar";

export default async function Home({ searchParams }: { searchParams: Promise<{ view?: string; sinceCT?: string | string[] }> }) {
  const params = await searchParams;
  const sinceCT = params[SINCE_CT_PARAM];
  const parsedSince = parseChicagoSince(typeof sinceCT === "string" ? sinceCT : undefined);
  const logs = await prisma.log.findMany({
    where: parsedSince ? { createdAt: { gte: parsedSince.instant } } : undefined,
    orderBy: { createdAt: "desc" },
  });
  return (
    <SimpleLog
      initialLogs={logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))}
      initialTab={tabFromView(params.view)}
      sinceLabel={parsedSince?.label}
    />
  );
}

function tabFromView(view: string | undefined): Tab {
  if (view === "calendar" || view === "chat") return view;
  return "log";
}
