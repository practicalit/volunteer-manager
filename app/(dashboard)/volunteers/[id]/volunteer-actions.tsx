"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, MoreVertical, Edit2, UserX, UserCheck, MessageSquare } from "lucide-react";

interface Team {
  id: string;
  name: string;
  category: { id: string; name: string; color: string };
}

interface Volunteer {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  optedOut: boolean;
}

interface VolunteerActionsProps {
  volunteer: Volunteer;
  allTeams?: Team[];
  memberTeamIds?: string[];
  mode?: "actions" | "teams";
}

export function VolunteerActions({ volunteer, allTeams = [], memberTeamIds = [], mode = "actions" }: VolunteerActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [addTeamOpen, setAddTeamOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);

  const availableTeams = allTeams.filter((t) => !memberTeamIds.includes(t.id));

  async function toggleActive() {
    setLoading(true);
    const res = await fetch(`/api/volunteers/${volunteer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !volunteer.isActive }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success(volunteer.isActive ? "Volunteer deactivated" : "Volunteer activated");
      router.refresh();
    }
  }

  async function addToTeam() {
    if (!selectedTeamId) return;
    setLoading(true);
    const res = await fetch(`/api/teams/${selectedTeamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addVolunteerId: volunteer.id }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Added to team");
      setAddTeamOpen(false);
      setSelectedTeamId("");
      router.refresh();
    } else {
      toast.error("Failed to add to team");
    }
  }

  async function removeFromTeam(teamId: string) {
    setLoading(true);
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeVolunteerId: volunteer.id }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Removed from team");
      router.refresh();
    }
  }

  if (mode === "teams") {
    return (
      <>
        <Button variant="outline" size="sm" onClick={() => setAddTeamOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add to Team
        </Button>

        <Dialog open={addTeamOpen} onOpenChange={setAddTeamOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Team</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              {availableTeams.length === 0 ? (
                <p className="text-sm text-gray-500">Already in all available teams.</p>
              ) : (
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId} placeholder="Select a team...">
                  {availableTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name} ({t.category.name})</SelectItem>
                  ))}
                </Select>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddTeamOpen(false)}>Cancel</Button>
              <Button onClick={addToTeam} disabled={!selectedTeamId || loading}>Add</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleActive}
          disabled={loading}
        >
          {volunteer.isActive ? (
            <><UserX className="h-4 w-4" /> Deactivate</>
          ) : (
            <><UserCheck className="h-4 w-4" /> Activate</>
          )}
        </Button>
      </div>
    </>
  );
}
