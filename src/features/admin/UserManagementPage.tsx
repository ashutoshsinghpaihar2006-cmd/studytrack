import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  GraduationCap,
  KeyRound,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../app/providers";
import { Button, EmptyState, InlineError, LoadingState, PageHeader, Panel, StatusBadge, SuccessNote } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { Profile, UserRole } from "../../lib/database.types";

export function UserManagementPage() {
  const { client, user, role, logActivity } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { data: profiles = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin_profiles"],
    enabled: Boolean(client && role === "admin"),
    queryFn: async () => {
      if (!client) return [];
      const { data, error: err } = await client
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      return (data ?? []) as Profile[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, newRole, approved }: { id: string; newRole?: UserRole; approved?: boolean }) => {
      if (!client) return;
      const updates: Partial<Profile> = {};
      if (newRole !== undefined) updates.role = newRole;
      if (approved !== undefined) updates.approved = approved;
      updates.updated_at = new Date().toISOString();

      const { error: err } = await client.from("profiles").update(updates).eq("id", id);
      if (err) throw err;

      await logActivity(
        approved === true ? "Approved user account" : approved === false ? "Deactivated user account" : "Updated user role",
        "profiles",
        id,
        `Role: ${newRole ?? "unchanged"}, Approved: ${approved ?? "unchanged"}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin_profiles"] });
      setSuccess("User account updated successfully.");
      setError("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to update user profile.");
      setSuccess("");
    },
  });

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const matchSearch =
        search === "" ||
        p.full_name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "all" || p.role === roleFilter;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "pending" && !p.approved) ||
        (statusFilter === "approved" && p.approved);
      return matchSearch && matchRole && matchStatus;
    });
  }, [profiles, search, roleFilter, statusFilter]);

  const pendingProfessors = useMemo(() => {
    return profiles.filter((p) => p.role === "professor" && !p.approved);
  }, [profiles]);

  if (role !== "admin") {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-ink">Access Restricted</h2>
        <p className="mt-1 text-sm text-slate-500">Only system administrators can access user management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="User & Role Management"
        description="Oversee user accounts, approve professor registrations, and assign institutional permissions."
      />

      {error && <InlineError message={error} />}
      {success && <SuccessNote message={success} />}

      {/* Pending Approvals Callout */}
      {pendingProfessors.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  {pendingProfessors.length} Professor{pendingProfessors.length > 1 ? "s" : ""} Awaiting Approval
                </h3>
                <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">
                  These faculty members have registered and cannot sign in until you approve their credentials.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pendingProfessors.map((prof) => (
              <div key={prof.id} className="flex items-center justify-between rounded-xl bg-white p-3 border border-amber-100 shadow-xs">
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-xs text-ink truncate">{prof.full_name}</div>
                  <div className="text-[10px] text-slate-400">Registered {formatDate(prof.created_at)}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateMutation.mutate({ id: prof.id, approved: true })}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="field-control pl-8 text-xs py-1.5"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="field-control w-auto text-xs py-1.5"
          >
            <option value="all">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="professor">Professors</option>
            <option value="student">Students</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="field-control w-auto text-xs py-1.5"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Active / Approved</option>
            <option value="pending">Pending Approval</option>
          </select>
        </div>

        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-ink font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Profiles Table */}
      <Panel title="User Accounts" description={`${filtered.length} total users match your criteria.`}>
        {isLoading ? (
          <div className="py-12">
            <LoadingState label="Loading registered users..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No users found"
            message="No registered user profiles matched your current search filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Current Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const isCurrent = p.id === user?.id;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-ink">
                        <div className="flex items-center gap-2.5">
                          <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 font-bold text-slate-600 text-[11px]">
                            {p.full_name[0]?.toUpperCase() ?? "U"}
                          </div>
                          <div>
                            <div>{p.full_name}</div>
                            {isCurrent && <span className="text-[10px] text-indigo-600 font-semibold">(You)</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          value={p.role}
                          disabled={isCurrent || updateMutation.isPending}
                          onChange={(e) => updateMutation.mutate({ id: p.id, newRole: e.target.value as UserRole })}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-hidden disabled:opacity-50"
                        >
                          <option value="student">Student</option>
                          <option value="professor">Professor</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td className="px-5 py-3.5">
                        {p.approved ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="h-3 w-3" />
                            Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200/60">
                            <ShieldAlert className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {!isCurrent && (
                          <div className="flex items-center justify-end gap-1.5">
                            {p.approved ? (
                              <button
                                onClick={() => updateMutation.mutate({ id: p.id, approved: false })}
                                title="Deactivate user"
                                className="px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-rose-600 rounded-md border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-colors"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => updateMutation.mutate({ id: p.id, approved: true })}
                                title="Approve user"
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
