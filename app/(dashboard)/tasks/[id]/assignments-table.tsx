"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RefreshCw, Trash2 } from "lucide-react";

interface Assignment {
  id: string;
  status: string;
  volunteer: { id: string; firstName: string; lastName: string; phone: string };
  smsSentAt: string | null;
  respondedAt: string | null;
}

interface Props {
  taskId: string;
  assignments: Assignment[];
  smsMode: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  NO_RESPONSE: "No Response",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-800",
  NO_RESPONSE: "bg-gray-100 text-gray-600",
};

export function AssignmentsTable({ taskId, assignments, smsMode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function resend(assignmentId: string) {
    setLoading(assignmentId);
    const res = await fetch(`/api/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resend: true }),
    });
    setLoading(null);
    if (res.ok) {
      toast.success(smsMode === "live" ? "SMS resent" : "SMS simulated");
      router.refresh();
    } else {
      toast.error("Failed to resend SMS");
    }
  }

  async function simulateReply(assignmentId: string, reply: string) {
    const res = await fetch("/api/sms/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignmentId, reply }),
    });
    if (res.ok) {
      toast.success(`Simulated reply "${reply}"`);
      router.refresh();
    } else {
      toast.error("Simulation failed");
    }
  }

  async function remove(assignmentId: string) {
    if (!confirm("Remove this assignment?")) return;
    setLoading(assignmentId + "-del");
    const res = await fetch(`/api/assignments/${assignmentId}`, { method: "DELETE" });
    setLoading(null);
    if (res.ok) {
      toast.success("Assignment removed");
      router.refresh();
    } else {
      toast.error("Failed to remove assignment");
    }
  }

  if (assignments.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-6">No volunteers assigned yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm divide-y divide-gray-100">
        <thead>
          <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
            <th className="pb-3">Volunteer</th>
            <th className="pb-3">Status</th>
            <th className="pb-3">SMS Sent</th>
            <th className="pb-3">Responded</th>
            <th className="pb-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {assignments.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="py-2 pr-4">
                <div className="font-medium text-gray-900">{a.volunteer.firstName} {a.volunteer.lastName}</div>
                <div className="text-xs text-gray-400">{a.volunteer.phone}</div>
              </td>
              <td className="py-2 pr-4">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] ?? "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[a.status] ?? a.status}
                </span>
              </td>
              <td className="py-2 pr-4 text-gray-500 text-xs">
                {a.smsSentAt ? new Date(a.smsSentAt).toLocaleString() : "—"}
              </td>
              <td className="py-2 pr-4 text-gray-500 text-xs">
                {a.respondedAt ? new Date(a.respondedAt).toLocaleString() : "—"}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-1">
                  <button
                    title="Resend SMS"
                    onClick={() => resend(a.id)}
                    disabled={loading === a.id}
                    className="rounded p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </button>

                  {smsMode === "simulation" && (
                    <>
                      <button
                        title="Simulate: reply 1 (Confirm)"
                        onClick={() => simulateReply(a.id, "1")}
                        className="rounded px-1.5 py-0.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 border border-green-200"
                      >
                        1
                      </button>
                      <button
                        title="Simulate: reply 2 (Decline)"
                        onClick={() => simulateReply(a.id, "2")}
                        className="rounded px-1.5 py-0.5 text-xs text-red-700 bg-red-50 hover:bg-red-100 border border-red-200"
                      >
                        2
                      </button>
                    </>
                  )}

                  <button
                    title="Remove assignment"
                    onClick={() => remove(a.id)}
                    disabled={loading === a.id + "-del"}
                    className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
