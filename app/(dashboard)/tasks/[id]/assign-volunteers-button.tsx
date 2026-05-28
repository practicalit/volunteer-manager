"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, MessageSquare } from "lucide-react";

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface Assignment {
  id: string;
  volunteerId: string;
}

interface Props {
  taskId: string;
  volunteers: Volunteer[];
  existingAssignments: Assignment[];
  teamMemberIds: string[];
  smsMode: string;
}

export function AssignVolunteersButton({ taskId, volunteers, existingAssignments, teamMemberIds, smsMode }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const assignedIds = new Set(existingAssignments.map((a) => a.volunteerId));

  function openDialog() {
    // Pre-select team members who aren't already assigned
    const preselect = teamMemberIds.filter((id) => !assignedIds.has(id));
    setSelected(preselect);
    setSearch("");
    setCustomMessage("");
    setOpen(true);
  }
  const available = volunteers.filter((v) => !assignedIds.has(v.id));
  const filtered = search
    ? available.filter((v) => `${v.firstName} ${v.lastName}`.toLowerCase().includes(search.toLowerCase()))
    : available;

  function toggle(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function assign() {
    if (selected.length === 0) return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerIds: selected, customMessage: customMessage || undefined }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(`${selected.length} volunteer${selected.length !== 1 ? "s" : ""} assigned${smsMode === "live" ? " and SMS sent" : " (simulated SMS)"}`);
      setOpen(false);
      setSelected([]);
      setCustomMessage("");
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to assign volunteers");
    }
  }

  return (
    <>
      <Button onClick={openDialog}>
        <UserPlus className="h-4 w-4" />
        Assign Volunteers
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Volunteers</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {teamMemberIds.length > 0 && (
              <p className="text-xs text-indigo-600 bg-indigo-50 rounded-md px-3 py-2">
                Team members are pre-selected. Add or remove any volunteers below.
              </p>
            )}
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search volunteers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="max-h-52 overflow-y-auto space-y-1 border rounded-md p-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  {available.length === 0 ? "All volunteers are already assigned." : "No volunteers found."}
                </p>
              ) : (
                filtered.map((v) => (
                  <label key={v.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(v.id)}
                      onChange={() => toggle(v.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                    />
                    <span className="text-sm font-medium text-gray-900">{v.firstName} {v.lastName}</span>
                    {teamMemberIds.includes(v.id) && (
                      <span className="text-xs bg-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">team</span>
                    )}
                    <span className="text-xs text-gray-400 ml-auto">{v.phone}</span>
                  </label>
                ))
              )}
            </div>

            {selected.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Custom SMS message (optional)
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={2}
                  placeholder="Leave blank to use default message"
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                />
                <div className="flex items-center gap-2 mt-1">
                  <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {smsMode === "live" ? "SMS will be sent via Twilio" : "SMS will be simulated (SMS_MODE=simulation)"}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={assign} disabled={loading || selected.length === 0}>
              {loading ? "Sending…" : `Assign ${selected.length > 0 ? `(${selected.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
