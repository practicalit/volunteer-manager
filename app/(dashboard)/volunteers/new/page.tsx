"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { volunteerSchema, type VolunteerInput, type AvailabilitySlot } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { X, Plus, Trash2 } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

type Category = { id: string; name: string; color: string };

export default function NewVolunteerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VolunteerInput>({ resolver: zodResolver(volunteerSchema) });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  function addSkill() {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills([...skills, s]);
      setSkillInput("");
    }
  }

  function toggleCategory(id: string) {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function addAvailabilitySlot() {
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
    const res = await fetch("/api/volunteers", {
      method: "POST",
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
      toast.error(json.error || "Failed to create volunteer");
    } else {
      toast.success("Volunteer added successfully");
      router.push(`/volunteers/${json.id}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Volunteer</h1>
        <p className="text-sm text-gray-500">Add a volunteer to your organization&apos;s shared directory.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Volunteer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name *</Label>
                <Input id="firstName" placeholder="Jane" {...register("firstName")} />
                {errors.firstName && <p className="text-xs text-red-600">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name *</Label>
                <Input id="lastName" placeholder="Smith" {...register("lastName")} />
                {errors.lastName && <p className="text-xs text-red-600">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone number * <span className="text-xs text-gray-400">(used for SMS)</span></Label>
              <Input id="phone" placeholder="(555) 123-4567" {...register("phone")} />
              {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email <span className="text-xs text-gray-400">(optional)</span></Label>
              <Input id="email" type="email" placeholder="jane@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>

            {/* Skill Categories */}
            {categories.length > 0 && (
              <div className="space-y-2">
                <Label>Skill Categories <span className="text-xs text-gray-400">(optional)</span></Label>
                <p className="text-xs text-gray-500">Select the areas this volunteer can help with.</p>
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
                  <p className="text-xs text-gray-500 mt-0.5">Days and times this volunteer is typically available.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAvailabilitySlot}>
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add slot
                </Button>
              </div>
              {availability.length > 0 && (
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
              )}
              {availability.length === 0 && (
                <p className="text-xs text-gray-400 italic">No availability slots added yet.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes <span className="text-xs text-gray-400">(optional)</span></Label>
              <Textarea id="notes" placeholder="Any relevant notes about this volunteer..." {...register("notes")} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Volunteer"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
