import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, ListChecks, RefreshCw, Search, ShieldAlert, User } from "lucide-react";
import { useAuth } from "../../app/providers";
import { EmptyState, LoadingState, PageHeader, Panel } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { ActivityLog } from "../../lib/database.types";

export function ActivityLogPage() {
  const { client, role } = useAuth();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ["activity_logs"],
    enabled: Boolean(client && role === "admin"),
    queryFn: async () => {
      if (!client) return [];
      const { data, error: err } = await client
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) throw err;
      return (data ?? []) as ActivityLog[];
    },
  });

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        search === "" ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        (log.user_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (log.details ?? "").toLowerCase().includes(search.toLowerCase());
      const matchEntity = entityFilter === "all" || log.entity_type === entityFilter;
      return matchSearch && matchEntity;
    });
  }, [logs, search, entityFilter]);

  if (role !== "admin") {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-ink">Access Restricted</h2>
        <p className="mt-1 text-sm text-slate-500">Only administrators can inspect institutional audit logs.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Security & Audit"
          title="Activity & Audit Trail"
          description="Chronological record of system modifications, attendance updates, marks entries, and account events."
        />
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Log
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search action or user..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-control pl-8 text-xs py-1.5"
          />
        </div>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="field-control w-auto text-xs py-1.5"
        >
          <option value="all">All Entity Types</option>
          <option value="attendance">Attendance</option>
          <option value="marks">Marks</option>
          <option value="assignments">Assignments</option>
          <option value="exams">Exams</option>
          <option value="profiles">Profiles / Users</option>
          <option value="announcements">Announcements</option>
        </select>
      </div>

      <Panel title="Audit History" description={`Showing ${filtered.length} recent activity entries.`}>
        {isLoading ? (
          <div className="py-12">
            <LoadingState label="Loading activity logs..." />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No activity recorded"
            message="No administrative actions match your current search criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-5 py-3 font-sans font-semibold text-ink whitespace-nowrap">
                      {log.user_name ?? "System"}
                    </td>
                    <td className="px-5 py-3 font-sans font-medium text-indigo-700 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase font-bold text-slate-600">
                        {log.entity_type}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-sans text-xs text-slate-600 max-w-md truncate">
                      {log.details ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
