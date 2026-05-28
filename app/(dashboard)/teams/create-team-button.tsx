"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { teamSchema, type TeamInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Category { id: string; name: string; }
interface User { id: string; name: string; }

interface CreateTeamButtonProps {
  categories: Category[];
  users: User[];
}

export function CreateTeamButton({ categories, users }: CreateTeamButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TeamInput>({ resolver: zodResolver(teamSchema) });

  const categoryId = watch("categoryId", "");
  const leaderId = watch("leaderId", "");

  async function onSubmit(data: TeamInput) {
    setLoading(true);
    const res = await fetch("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success("Team created");
      setOpen(false);
      reset();
      router.push(`/teams/${json.id}`);
    } else {
      toast.error(json.error || "Failed to create team");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Team
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select value={categoryId} onValueChange={(v) => setValue("categoryId", v, { shouldValidate: true })} placeholder="Select category...">
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Team Name *</Label>
              <Input placeholder="e.g. Sunday Parking Crew" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea placeholder="What does this team do?" {...register("description")} />
            </div>

            <div className="space-y-1.5">
              <Label>Team Leader *</Label>
              <Select value={leaderId} onValueChange={(v) => setValue("leaderId", v, { shouldValidate: true })} placeholder="Select leader...">
                {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading || !categoryId || !leaderId}>
                {loading ? "Creating..." : "Create Team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
