"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowUpRight, ArrowDownLeft, MessageSquare } from "lucide-react";

interface SmsLog {
  id: string;
  direction: string;
  to: string | null;
  from: string | null;
  body: string;
  status: string | null;
  isSimulated: boolean;
  volunteer: { id: string; firstName: string; lastName: string } | null;
  createdAt: string;
}

interface Props {
  logs: SmsLog[];
  smsMode: string;
}

export function SmsLogClient({ logs, smsMode }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"all" | "simulation">("all");
  const [loading, setLoading] = useState<string | null>(null);

  const displayed = tab === "simulation" ? logs.filter((l) => l.isSimulated) : logs;

  async function simulateReply(phone: string, reply: string, label: string) {
    setLoading(phone + reply);
    const res = await fetch("/api/sms/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: phone, body: reply }),
    });
    setLoading(null);
    if (res.ok) {
      toast.success(`Simulated reply "${label}"`);
      router.refresh();
    } else {
      toast.error("Simulation failed");
    }
  }

  const pill = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
      active ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  return (
    <div>
      <div className="flex items-center gap-4 border-b border-gray-200 mb-4">
        <button className={pill(tab === "all")} onClick={() => setTab("all")}>
          All Messages ({logs.length})
        </button>
        {smsMode === "simulation" && (
          <button className={pill(tab === "simulation")} onClick={() => setTab("simulation")}>
            Simulation Inbox ({logs.filter((l) => l.isSimulated).length})
          </button>
        )}
      </div>

      {displayed.length === 0 ? (
        <div className="py-16 text-center text-gray-400">
          <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No messages yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((log) => {
            const isOut = log.direction === "OUTBOUND";
            const phone = isOut ? log.to : log.from;
            return (
              <div
                key={log.id}
                className={`flex items-start gap-3 rounded-lg border p-3 ${
                  isOut ? "bg-white" : "bg-blue-50 border-blue-200"
                }`}
              >
                <div className={`mt-0.5 rounded-full p-1 ${isOut ? "bg-indigo-100 text-indigo-600" : "bg-green-100 text-green-600"}`}>
                  {isOut ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownLeft className="h-3.5 w-3.5" />}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {log.volunteer ? (
                      <span className="text-sm font-medium text-gray-900">
                        {log.volunteer.firstName} {log.volunteer.lastName}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 font-mono">{phone}</span>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">
                      {isOut ? "Outbound" : "Inbound"}
                    </Badge>
                    {log.isSimulated && (
                      <Badge variant="secondary" className="text-xs">Simulated</Badge>
                    )}
                    {log.status && (
                      <span className="text-xs text-gray-400">{log.status}</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{log.body}</p>

                  {/* Simulation action buttons — only for outbound simulated messages */}
                  {log.isSimulated && isOut && log.to && (
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs text-gray-400 self-center">Simulate reply:</span>
                      <button
                        onClick={() => simulateReply(log.to!, "1", "1 (Confirm)")}
                        disabled={!!loading}
                        className="rounded px-2 py-0.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50"
                      >
                        1 — Confirm
                      </button>
                      <button
                        onClick={() => simulateReply(log.to!, "2", "2 (Decline)")}
                        disabled={!!loading}
                        className="rounded px-2 py-0.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                      >
                        2 — Decline
                      </button>
                      <button
                        onClick={() => simulateReply(log.to!, "STOP", "STOP (Opt-out)")}
                        disabled={!!loading}
                        className="rounded px-2 py-0.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
                      >
                        STOP
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
