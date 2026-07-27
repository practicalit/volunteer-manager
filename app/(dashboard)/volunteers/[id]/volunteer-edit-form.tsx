"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { volunteerSchema, type VolunteerInput, type AvailabilitySlot } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Edit2, X, Plus, Trash2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

interface Category {
  id: string;
  name: string;
  color: string;
}

interface VolunteerEditFormProps {
  volunteer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
    skills: string[];
    notes: string | null;
    availability: unknown;
    categories: { categoryId: string }[];
  };
  categories: Category[];
}

function parseAvailability(raw: unknown): AvailabilitySlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is AvailabilitySlot => {
    if (!s || typeof s !== "object") return false;
    const obj = s as Record<string, unknown>;
    return (
      typeof obj.day === "string" &&
      typeof obj.startTime === "string" &&
      typeof obj.endTime === "string"
    );
  });
}

export function VolunteerEditForm({ volunteer, categories }: VolunteerEditFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [skills, setSkills] = useState<string[]>(volunteer.skills);
  const [skillInput, setSkillInput] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    volunteer.categories.map((c) => c.categoryId)
  );
  const [availability, setAvailability] = useState<AvailabilitySlot[]>(
    parseAvailability(volunteer.availability)
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VolunteerInput>({
    resolver: zodResolver(volunteerSchema),
    defaultValues: {
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      phone: volunteer.phone,
      email: volunteer.email ?? "",
      notes: volunteer.notes ?? "",
    },
  });

  function openDialog() {
    // Reset local state to current volunteer values each time the dialog opens
    setSkills(volunteer.skills);
    setSkillInput("");
    setSelectedCategoryIds(volunteer.categories.map((c) => c.categoryId));
    setAvailability(parseAvailability(volunteer.availability));
    reset({
      firstName: volunteer.firstName,
      lastName: volunteer.lastName,
      phone: volunteer.phone,
      email: volunteer.email ?? "",
      notes: volunteer.notes ?? "",
    });
    setOpen(true);
  }

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
      setSkillInput("");
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addSlot() {
    setAvailability((prev) => [...prev, { day: "Monday", startTime: "09:00", endTime: "17:00" }]);
  }

  function updateSlot(index: number, field: keyof AvailabilitySlot, value: string) {
    setAvailability((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  }

  function removeSlot(index: number) {
    setAvailability((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(data: VolunteerInput) {
    setLoading(true);
    const res = await fetch(`/api/volunteers/${volunteer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        skills,
        categoryIds: selectedCategoryIds,
        availability,
      }),
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(json.error || "Failed to update volunteer");
    } else {
      toast.success("Volunteer updated");
      setOpen(false);
      router.refresh();
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <Edit2 className="h-4 w-4" />
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Volunteer</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-firstName">First name *</Label>
                <Input id="edit-firstName" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-lastName">Last name *</Label>
                <Input id="edit-lastName" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone">Phone number *</Label>
              <Input id="edit-phone" placeholder="(555) 123-4567" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email <span className="text-xs text-gray-400">(optional)</span></Label>
              <Input id="edit-email" type="email" placeholder="jane@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            {/* Skill Categories */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Skill Categories <span className="text-xs text-gray-400">(optional)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const checked = selectedCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => toggleCategory(cat.id)}
                        className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          checked
                            ? "border-transparent text-white"
                            : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                        }`}
                        style={checked ? { backgroundColor: cat.color } : {}}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: checked ? "rgba(255,255,255,0.6)" : cat.color }}
                        />
                        {cat.name}
                        {checked && <X className="h-3 w-3 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skills (free text) */}
            <div className="space-y-1.5">
              <Label>Additional Skills <span className="text-xs text-gray-400">(optional)</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Audio/Visual, Cooking..."
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="flex items-center gap-1 rounded-full bg-primary-light px-2.5 py-0.5 text-xs text-primary-hover"
                    >
                      {s}
                      <button
                        type="button"
                        onClick={() => setSkills(skills.filter((x) => x !== s))}
                        className="hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Availability */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Availability <span className="text-xs text-gray-400">(optional)</span></Label>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addSlot}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add slot
                </Button>
              </div>
              {availability.length > 0 ? (
                <div className="space-y-2">
                  {availability.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-2">
                      <select
                        value={slot.day}
                        onChange={(e) => updateSlot(i, "day", e.target.value)}
                        className="flex-1 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {DAYS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <span className="text-xs text-gray-400">to</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        type="button"
                        onClick={() => removeSlot(i)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No availability slots added yet.</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes">Notes <span className="text-xs text-gray-400">(optional)</span></Label>
              <Textarea id="edit-notes" placeholder="Any relevant notes..." {...register("notes")} />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
