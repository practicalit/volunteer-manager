// @ts-nocheck
// @ts-nocheck
import { requireAuth } from "@/lib/session";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SmsLogClient } from "./sms-log-client";

interface PageProps {
  searchParams: { page?: string };
}

export default async function SmsLogPage({ searchParams }: PageProps) {
  const session = await requireAuth();
  const orgId = session.user.organizationId;
  const smsMode = process.env.SMS_MODE ?? "simulation";
  const page = Math.max(1, Number(searchParams.page ?? 1));
  const PAGE_SIZE = 50;

  const orgFilter = {
    OR: [
      { volunteer: { organizationId: orgId } },
      { sentBy: { organizationId: orgId } },
    ],
  };

  const [total, logs] = await Promise.all([
    prisma.smsLog.count({ where: orgFilter }),
    prisma.smsLog.findMany({
      where: orgFilter,
      include: {
        volunteer: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMS Log</h1>
          <p className="text-sm text-gray-500">{total} messages</p>
        </div>
        <Badge variant={smsMode === "live" ? "default" : "secondary"} className="capitalize">
          {smsMode === "live" ? "Live (Twilio)" : "Simulation Mode"}
        </Badge>
      </div>

      <Card>
        <CardContent className="pt-4">
          <SmsLogClient
            logs={logs.map((l) => ({
              id: l.id,
              direction: l.direction,
              to: l.to,
              from: l.from,
              body: l.body,
              status: l.status,
              isSimulated: l.isSimulated,
              volunteer: l.volunteer,
              createdAt: l.createdAt.toISOString(),
            }))}
            smsMode={smsMode}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link href={`/sms-log?page=${page - 1}`}>
                    <Badge variant="outline" className="cursor-pointer">← Previous</Badge>
                  </Link>
                )}
                {page < totalPages && (
                  <Link href={`/sms-log?page=${page + 1}`}>
                    <Badge variant="outline" className="cursor-pointer">Next →</Badge>
                  </Link>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
