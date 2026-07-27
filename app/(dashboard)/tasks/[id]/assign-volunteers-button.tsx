"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, MessageSquare, AlertTriangle, CheckCircle2, ArrowLeft, ChevronRight } from "lucide-react";

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
  /** Map of volunteerId → conflicting task name */
  conflictingVolunteers?: Record<string, string>;
}

export function AssignVolunteersButton({
  taskId,
  volunteers,
  existingAssignments,
  teamMemberIds,
  smsMode,
  conflictingVolunteers = {},
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"select" | "review">("select");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  // Volunteers the lead explicitly chose to force-assign despite conflict
  const [forced, setForced] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const assignedIds = new Set(existingAssignments.map((a) => a.volunteerId));
  const available = volunteers.filter((v) => !assignedIds.has(v.id));

  // Split into 4 groups for Step 1 display
  const teamFree   = available.filter((v) =>  teamMemberIds.includes(v.id) && !conflictingVolunteers[v.id]);
  const teamBusy   = available.filter((v) =>  teamMemberIds.includes(v.id) &&  !!conflictingVolunteers[v.id]);
  const otherFree  = available.filter((v) => !teamMemberIds.includes(v.id) && !conflictingVolunteers[v.id]);
  const otherBusy  = available.filter((v) => !teamMemberIds.includes(v.id) &&  !!conflictingVolunteers[v.id]);

  function openDialog() {
    // Pre-select only conflict-free team members
    setSelected(teamFree.map((v) => v.id));
    setForced([]);
    setSearch("");
    setCustomMessage("");
    setStep("select");
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
  }

  function applySearch(list: Volunteer[]) {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((v) => `${v.firstName} ${v.lastName}`.toLowerCase().includes(q));
  }

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleForce(id: string) {
    setForced((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Review step derived values
  const selectedFree = selected.filter((id) => !conflictingVolunteers[id]);
  const selectedBusy = selected.filter((id) => !!conflictingVolunteers[id]);
  const forcedAndBusy = selectedBusy.filter((id) => forced.includes(id));
  const skippedBusy = selectedBusy.filter((id) => !forced.includes(id));

  // Final list actually sent to API
  const toAssign = [...selectedFree, ...forcedAndBusy];

  async function assign() {
    if (toAssign.length === 0) return;
    setLoading(true);
    const res = await fetch(`/api/tasks/${taskId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        volunteerIds: toAssign,
        forceVolunteerIds: forcedAndBusy,
        customMessage: customMessage || undefined,
      }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      const skipped = (data.conflicts as { volunteerId: string }[] ?? []).length;
      const assigned = toAssign.length - skipped;
      const msg = skipped > 0
        ? `${assigned} assigned, ${skipped} skipped due to conflict.`
        : `${assigned} volunteer${assigned !== 1 ? "s" : ""} assigned${smsMode === "live" ? " and SMS sent" : " (simulated SMS)"}.`;
      skipped > 0 ? toast.warning(msg) : toast.success(msg);
      closeDialog();
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to assign volunteers");
    }
  }

  const filteredTeamFree  = applySearch(teamFree);
  const filteredTeamBusy  = applySearch(teamBusy);
  const filteredOtherFree = applySearch(otherFree);
  const filteredOtherBusy = applySearch(otherBusy);

  const busySelected = selected.filter((id) => !!conflictingVolunteers[id]);

  return (
    <>
      <Button onClick={openDialog}>
        <UserPlus className="h-4 w-4" />
        Assign Volunteers
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="max-w-lg">

          {/* ── STEP 1: Select ─────────────────────────────────────── */}
          {step === "select" && (
            <>
              <DialogHeader>
                <DialogTitle>Assign Volunteers</DialogTitle>
              </DialogHeader>

              <div className="space-y-3 py-2">
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Search volunteers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <div className="max-h-80 overflow-y-auto space-y-0.5 border rounded-md p-2">
                  {/* ── Team Members ── */}
                  {(filteredTeamFree.length > 0 || filteredTeamBusy.length > 0) && (
                    <>
                      <div className="flex items-center gap-2 px-1 pb-1 pt-0.5">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Team Members
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-xs text-gray-400">
                          {filteredTeamFree.length} available
                          {filteredTeamBusy.length > 0 && `, ${filteredTeamBusy.length} busy`}
                        </span>
                      </div>

                      {filteredTeamFree.map((v) => (
                        <label key={v.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.includes(v.id)}
                            onChange={() => toggle(v.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary"
                          />
                          <span className="text-sm font-medium text-gray-900">{v.firstName} {v.lastName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{v.phone}</span>
                        </label>
                      ))}

                      {filteredTeamBusy.map((v) => (
                        <label
                          key={v.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                          title={`Already assigned to "${conflictingVolunteers[v.id]}"`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(v.id)}
                            onChange={() => toggle(v.id)}
                            className="h-4 w-4 rounded border-amber-300 text-amber-600"
                          />
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700">{v.firstName} {v.lastName}</span>
                          <span className="ml-auto text-xs text-amber-700 whitespace-nowrap truncate max-w-[8.75rem]">
                            {conflictingVolunteers[v.id]}
                          </span>
                        </label>
                      ))}
                    </>
                  )}

                  {/* ── Other Volunteers ── */}
                  {(filteredOtherFree.length > 0 || filteredOtherBusy.length > 0) && (
                    <>
                      <div className="flex items-center gap-2 px-1 pb-1 pt-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Other Volunteers
                        </span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>

                      {filteredOtherFree.map((v) => (
                        <label key={v.id} className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selected.includes(v.id)}
                            onChange={() => toggle(v.id)}
                            className="h-4 w-4 rounded border-gray-300 text-primary"
                          />
                          <span className="text-sm font-medium text-gray-900">{v.firstName} {v.lastName}</span>
                          <span className="text-xs text-gray-400 ml-auto">{v.phone}</span>
                        </label>
                      ))}

                      {filteredOtherBusy.map((v) => (
                        <label
                          key={v.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 bg-amber-50 hover:bg-amber-100 cursor-pointer"
                          title={`Already assigned to "${conflictingVolunteers[v.id]}"`}
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(v.id)}
                            onChange={() => toggle(v.id)}
                            className="h-4 w-4 rounded border-amber-300 text-amber-600"
                          />
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          <span className="text-sm font-medium text-gray-700">{v.firstName} {v.lastName}</span>
                          <span className="ml-auto text-xs text-amber-700 whitespace-nowrap truncate max-w-[8.75rem]">
                            {conflictingVolunteers[v.id]}
                          </span>
                        </label>
                      ))}
                    </>
                  )}

                  {available.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">All volunteers are already assigned.</p>
                  )}
                  {available.length > 0 && filteredTeamFree.length === 0 && filteredTeamBusy.length === 0 && filteredOtherFree.length === 0 && filteredOtherBusy.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No volunteers found.</p>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  {selected.length} selected
                  {busySelected.length > 0 && (
                    <span className="text-amber-600"> · {busySelected.length} busy (will need review)</span>
                  )}
                </p>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                <Button onClick={() => setStep("review")} disabled={selected.length === 0}>
                  Review
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogFooter>
            </>
          )}

          {/* ── STEP 2: Review ─────────────────────────────────────── */}
          {step === "review" && (
            <>
              <DialogHeader>
                <DialogTitle>Review &amp; Confirm</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">

                {/* Free — will be assigned */}
                {selectedFree.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-green-700 mb-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Will be assigned ({selectedFree.length})
                    </p>
                    <ul className="space-y-1">
                      {selectedFree.map((id) => {
                        const v = volunteers.find((x) => x.id === id)!;
                        const isTeam = teamMemberIds.includes(id);
                        return (
                          <li key={id} className="flex items-center justify-between rounded-md bg-green-50 px-3 py-1.5 text-sm">
                            <span className="font-medium text-gray-900">{v.firstName} {v.lastName}</span>
                            <span className={`text-xs rounded px-1.5 py-0.5 ${isTeam ? "bg-primary-lighter text-primary-hover" : "bg-gray-100 text-gray-500"}`}>
                              {isTeam ? "team member" : "additional"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Busy — decide per-volunteer */}
                {selectedBusy.length > 0 && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Scheduling conflict — decide individually ({selectedBusy.length})
                    </p>
                    <ul className="space-y-1.5">
                      {selectedBusy.map((id) => {
                        const v = volunteers.find((x) => x.id === id)!;
                        const isForced = forced.includes(id);
                        const isTeam = teamMemberIds.includes(id);
                        return (
                          <li
                            key={id}
                            className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                              isForced ? "border-primary-lighter bg-primary-light" : "border-amber-200 bg-amber-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-gray-900">{v.firstName} {v.lastName}</span>
                                  <span className={`text-xs rounded px-1.5 py-0.5 ${isTeam ? "bg-amber-200 text-amber-800" : "bg-gray-100 text-gray-500"}`}>
                                    {isTeam ? "team member" : "additional"}
                                  </span>
                                </div>
                                <p className="text-xs text-amber-700 truncate mt-0.5">
                                  Already on: {conflictingVolunteers[id]}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleForce(id)}
                                className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                                  isForced
                                    ? "border-primary-lighter bg-primary-lighter text-primary-hover hover:bg-primary-lighter"
                                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                                }`}
                              >
                                {isForced ? "Assign anyway ✓" : "Skip"}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {skippedBusy.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        {skippedBusy.length} volunteer{skippedBusy.length !== 1 ? "s" : ""} set to Skip will not be assigned.
                      </p>
                    )}
                  </div>
                )}

                {/* Custom message */}
                {toAssign.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Custom SMS message <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={2}
                      placeholder="Leave blank to use default message"
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                    />
                    <div className="flex items-center gap-1.5 mt-1">
                      <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {smsMode === "live" ? "SMS will be sent via Twilio" : "SMS will be simulated (SMS_MODE=simulation)"}
                      </span>
                    </div>
                  </div>
                )}

                {toAssign.length === 0 && (
                  <p className="text-sm text-center text-gray-400 py-2">
                    No volunteers will be assigned. Go back to adjust your selection.
                  </p>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setStep("select")}>
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
                <Button onClick={assign} disabled={loading || toAssign.length === 0}>
                  {loading ? "Assigning…" : `Confirm & Assign (${toAssign.length})`}
                </Button>
              </DialogFooter>
            </>
          )}

        </DialogContent>
      </Dialog>
    </>
  );
}

