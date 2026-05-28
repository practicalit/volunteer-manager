"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, UserMinus } from "lucide-react";

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
}

interface TeamMembersManagerProps {
  teamId: string;
  mode?: "add" | "remove";
  availableVolunteers?: Volunteer[];
  memberIds?: string[];
  volunteerId?: string;
}

export function TeamMembersManager({
  teamId,
  mode = "add",
  availableVolunteers = [],
  memberIds = [],
  volunteerId,
}: TeamMembersManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const notYetMembers = availableVolunteers.filter(
    (v) => !memberIds.includes(v.id)
  );

  const filtered = search
    ? notYetMembers.filter(
        (v) =>
          `${v.firstName} ${v.lastName}`.toLowerCase().includes(search.toLowerCase())
      )
    : notYetMembers;

  async function addVolunteer(vid: string) {
    setLoading(true);
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addVolunteerId: vid }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Volunteer added to team");
      setOpen(false);
      router.refresh();
    } else {
      toast.error("Failed to add volunteer");
    }
  }

  async function removeVolunteer() {
    if (!volunteerId) return;
    if (!confirm("Remove volunteer from this team?")) return;
    setLoading(true);
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeVolunteerId: volunteerId }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Volunteer removed from team");
      router.refresh();
    }
  }

  if (mode === "remove") {
    return (
      <button
        onClick={removeVolunteer}
        disabled={loading}
        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        title="Remove from team"
      >
        <UserMinus className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-4 w-4" />
        Add Member
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Members</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search volunteers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">
                  {notYetMembers.length === 0 ? "All volunteers are already members." : "No volunteers found."}
                </p>
              ) : (
                filtered.map((v) => (
                  <button
                    key={v.id}
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => addVolunteer(v.id)}
                    disabled={loading}
                  >
                    <span className="font-medium text-gray-900">{v.firstName} {v.lastName}</span>
                    <span className="text-xs text-indigo-600">+ Add</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
