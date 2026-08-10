import { prisma } from "@/lib/prisma";
import { SimpleLog } from "./simple-log";

export const dynamic = "force-dynamic";

export default async function Home() {
  const logs = await prisma.log.findMany({ orderBy: { createdAt: "desc" } });
  return <SimpleLog initialLogs={logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))} />;
}
