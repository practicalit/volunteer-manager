"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";

interface Category { id: string; name: string }
interface Template {
  id: string;
  name: string;
  description: string | null;
  rrule: string | null;
  defaultMessage: string | null;
  category: Category | null;
}

interface Props {
  templates: Template[];
  categories: Category[];
}

const empty = () => ({ name: "", description: "", categoryId: "", rrule: "", defaultMessage: "" });

export function TemplatesClient({ templates: initial, categories }: Props) {
  const router = useRouter();
  const [templates, setTemplates] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState(empty());
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setForm(empty());
    setOpen(true);
  }

  function openEdit(t: Template) {
    setEditing(t);
    setForm({
      name: t.name,
      description: t.description ?? "",
      categoryId: t.category?.id ?? "",
      rrule: t.rrule ?? "",
      defaultMessage: t.defaultMessage ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    const payload = {
      name: form.name.trim(),
      description: form.description || undefined,
      categoryId: form.categoryId || undefined,
      rrule: form.rrule || undefined,
      defaultMessage: form.defaultMessage || undefined,
    };

    const res = editing
      ? await fetch(`/api/templates/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

    setLoading(false);
    if (res.ok) {
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to save template");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } else {
      toast.error("Failed to delete template");
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Templates</h1>
          <p className="text-sm text-gray-500">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No templates yet. Create one to reuse task configurations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="relative">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="rounded p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => remove(t.id)} className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {t.description && <p className="text-sm text-gray-500 line-clamp-2">{t.description}</p>}
                <div className="flex flex-wrap gap-1">
                  {t.category && <Badge variant="outline" className="text-xs">{t.category.name}</Badge>}
                  {t.rrule && <Badge variant="secondary" className="text-xs font-mono">{t.rrule.split(";")[0]}</Badge>}
                </div>
                {t.defaultMessage && (
                  <p className="text-xs text-gray-400 italic line-clamp-2 border-t pt-2">"{t.defaultMessage}"</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Weekly Parking Duty"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <Label>Category</Label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>RRULE (recurrence rule)</Label>
              <Input
                className="mt-1 font-mono text-sm"
                value={form.rrule}
                onChange={(e) => setForm({ ...form, rrule: e.target.value })}
                placeholder="e.g. FREQ=WEEKLY;INTERVAL=1;BYDAY=SU"
              />
            </div>
            <div>
              <Label>Default SMS Message</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={form.defaultMessage}
                onChange={(e) => setForm({ ...form, defaultMessage: e.target.value })}
                placeholder="{{volunteer_name}}, you are needed for {{task_name}}..."
              />
              <p className="text-xs text-gray-400 mt-1">
                Tokens: {"{{volunteer_name}}"}, {"{{task_name}}"}, {"{{task_date}}"}, {"{{org_name}}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
