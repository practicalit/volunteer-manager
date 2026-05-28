"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  teamId: z.string().optional(),
  scheduledAt: z.string().min(1, "Date is required"),
  isRecurring: z.boolean(),
  rrule: z.string().optional(),
  customMessage: z.string().optional(),
  templateId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Category { id: string; name: string; color: string | null }
interface Team { id: string; name: string }
interface Template {
  id: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  rrule: string | null;
  defaultMessage: string | null;
}

interface Props {
  categories: Category[];
  teams: Team[];
  templates: Template[];
  defaultTeamId?: string;
}

const FREQ_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const WEEKDAYS = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function NewTaskForm({ categories, teams, templates, defaultTeamId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [freq, setFreq] = useState("WEEKLY");
  const [interval, setInterval] = useState(1);
  const [byDay, setByDay] = useState<string[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      isRecurring: false,
      teamId: defaultTeamId ?? "",
    },
  });

  const isRecurring = watch("isRecurring");
  const templateId = watch("templateId");

  function buildRrule(): string {
    let rule = `FREQ=${freq};INTERVAL=${interval}`;
    if (freq === "WEEKLY" && byDay.length > 0) {
      rule += `;BYDAY=${byDay.join(",")}`;
    }
    return rule;
  }

  function applyTemplate(id: string) {
    const tmpl = templates.find((t) => t.id === id);
    if (!tmpl) return;
    if (tmpl.description) setValue("description", tmpl.description);
    if (tmpl.categoryId) setValue("categoryId", tmpl.categoryId);
    if (tmpl.rrule) {
      setValue("isRecurring", true);
      setValue("rrule", tmpl.rrule);
    }
    if (tmpl.defaultMessage) setValue("customMessage", tmpl.defaultMessage);
    toast.success(`Template "${tmpl.name}" applied`);
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    const payload = {
      ...data,
      rrule: data.isRecurring ? buildRrule() : undefined,
    };

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);
    if (res.ok) {
      const task = await res.json();
      toast.success("Task created");
      router.push(`/tasks/${task.id}`);
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create task");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Template picker */}
      {templates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start from a Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Template</Label>
                <select
                  {...register("templateId")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select a template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => templateId && applyTemplate(templateId)}
                disabled={!templateId}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic info */}
      <Card>
        <CardHeader><CardTitle className="text-base">Task Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="name">Task Name *</Label>
            <Input id="name" {...register("name")} className="mt-1" placeholder="e.g. Parking Lot Duty" />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...register("description")} className="mt-1" rows={2} />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="categoryId">Category</Label>
              <select
                id="categoryId"
                {...register("categoryId")}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="teamId">Team</Label>
              <select
                id="teamId"
                {...register("teamId")}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— None —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="scheduledAt">Scheduled Date & Time *</Label>
            <Input id="scheduledAt" type="datetime-local" {...register("scheduledAt")} className="mt-1" />
            {errors.scheduledAt && <p className="mt-1 text-xs text-red-600">{errors.scheduledAt.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Recurrence */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Recurring Task
            </CardTitle>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("isRecurring")}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600"
              />
              <span className="text-sm text-gray-700">Enable recurrence</span>
            </label>
          </div>
        </CardHeader>
        {isRecurring && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency</Label>
                <select
                  value={freq}
                  onChange={(e) => setFreq(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {FREQ_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Every</Label>
                <Input
                  type="number"
                  min={1}
                  max={52}
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            {freq === "WEEKLY" && (
              <div>
                <Label>On days</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {WEEKDAYS.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setByDay((prev) =>
                          prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
                        )
                      }
                      className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                        byDay.includes(day)
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-gray-700 border-gray-300 hover:border-indigo-300"
                      }`}
                    >
                      {WEEKDAY_LABELS[i]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Rule: <code>FREQ={freq};INTERVAL={interval}{freq === "WEEKLY" && byDay.length > 0 ? `;BYDAY=${byDay.join(",")}` : ""}</code>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Custom message */}
      <Card>
        <CardHeader><CardTitle className="text-base">SMS Message</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            {...register("customMessage")}
            rows={3}
            placeholder="Leave blank to use the default message"
          />
          <p className="text-xs text-gray-500">
            Available tokens: <code className="bg-gray-100 px-1 rounded">{"{{volunteer_name}}"}</code>{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{task_name}}"}</code>{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{task_date}}"}</code>{" "}
            <code className="bg-gray-100 px-1 rounded">{"{{org_name}}"}</code>
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create Task"}</Button>
      </div>
    </form>
  );
}
