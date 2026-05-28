"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, UserCheck, UserX, MoreVertical, Trash2 } from "lucide-react";

interface Team { id: string; name: string }
interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  teams: Team[];
}

interface Props {
  users: User[];
  currentUserId: string;
}

export function UsersClient({ users: initial, currentUserId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initial);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  async function invite() {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("All fields are required");
      return;
    }
    setLoading("invite");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    });
    setLoading(null);
    if (res.ok) {
      toast.success("Team leader invited");
      setInviteOpen(false);
      setForm({ name: "", email: "", password: "" });
      router.refresh();
    } else {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Failed to create user");
    }
  }

  async function toggleActive(user: User) {
    setLoading(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    setLoading(null);
    if (res.ok) {
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      toast.success(user.isActive ? "User deactivated" : "User activated");
    } else {
      toast.error("Failed to update user");
    }
  }

  async function remove(user: User) {
    if (!confirm(`Delete ${user.name ?? user.email}? This cannot be undone.`)) return;
    setLoading(user.id + "-del");
    const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    setLoading(null);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast.success("User deleted");
    } else {
      toast.error("Failed to delete user");
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-sm text-gray-500">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Invite Team Leader
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Teams</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "ADMIN" ? "default" : "secondary"} className="capitalize text-xs">
                    {u.role === "ADMIN" ? "Admin" : "Team Leader"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.teams.length > 0
                      ? u.teams.map((t) => (
                          <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>
                        ))
                      : <span className="text-gray-400 text-xs">—</span>
                    }
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    u.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {u.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUserId && (
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => toggleActive(u)}
                        disabled={loading === u.id}
                        title={u.isActive ? "Deactivate" : "Activate"}
                        className="rounded p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      {u.role !== "ADMIN" && (
                        <button
                          onClick={() => remove(u)}
                          disabled={loading === u.id + "-del"}
                          title="Delete user"
                          className="rounded p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Leader</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Full Name</Label>
              <Input
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                className="mt-1"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@example.com"
              />
            </div>
            <div>
              <Label>Temporary Password</Label>
              <Input
                className="mt-1"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="They can change this later"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={invite} disabled={loading === "invite"}>
              {loading === "invite" ? "Creating…" : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
