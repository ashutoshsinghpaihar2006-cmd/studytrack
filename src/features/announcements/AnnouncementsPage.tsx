import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bell,
  BellRing,
  Calendar,
  Filter,
  Megaphone,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../../app/providers";
import { Button, EmptyState, InlineError, LoadingState, PageHeader, Panel, SuccessNote } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { Announcement } from "../../lib/database.types";

export function AnnouncementsPage() {
  const { client, user, role, profile, logActivity } = useAuth();
  const queryClient = useQueryClient();

  const [filterRole, setFilterRole] = useState<string>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState<"all" | "student" | "professor">("all");
  const [priority, setPriority] = useState<"low" | "normal" | "urgent">("normal");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canPost = role === "admin" || role === "professor";

  const { data: announcements = [], isLoading, refetch } = useQuery({
    queryKey: ["announcements"],
    enabled: Boolean(client && user),
    queryFn: async () => {
      if (!client) return [];
      const { data, error: err } = await client
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      return (data ?? []) as Announcement[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!client || !user) return;
      const { data, error: err } = await client.from("announcements").insert({
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        target_role: targetRole,
        priority,
      }).select().single();
      if (err) throw err;

      await logActivity(
        "Posted announcement",
        "announcements",
        data?.id,
        `Title: ${title}, Target: ${targetRole}, Priority: ${priority}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setModalOpen(false);
      setTitle("");
      setContent("");
      setTargetRole("all");
      setPriority("normal");
      setSuccess("Announcement broadcast successfully.");
      setError("");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to post announcement.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!client) return;
      const { error: err } = await client.from("announcements").delete().eq("id", id);
      if (err) throw err;
      await logActivity("Deleted announcement", "announcements", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setSuccess("Announcement removed.");
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to delete announcement.");
    },
  });

  const filtered = useMemo(() => {
    return announcements.filter((a) => {
      if (filterRole === "all") return true;
      return a.target_role === "all" || a.target_role === filterRole;
    });
  }, [announcements, filterRole]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          eyebrow="Communications"
          title="Campus Announcements"
          description="Institutional bulletins, academic deadlines, and classroom notices."
        />
        {canPost && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" />
            Post Announcement
          </Button>
        )}
      </div>

      {error && <InlineError message={error} />}
      {success && <SuccessNote message={success} />}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500">Audience:</span>
        {[
          ["all", "All Notices"],
          ["student", "Student Specific"],
          ["professor", "Faculty Only"],
        ].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterRole(val)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              filterRole === val
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="py-12">
          <LoadingState label="Loading announcements..." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No announcements"
          message="There are currently no active announcements for your role."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const isAuthorOrAdmin = role === "admin" || item.author_id === user?.id;
            const priorityBadge = {
              urgent: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
              normal: "bg-blue-50 text-blue-700 border-blue-200",
              low: "bg-slate-50 text-slate-600 border-slate-200",
            }[item.priority];

            return (
              <div
                key={item.id}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-subtle transition-shadow"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wider border ${priorityBadge}`}>
                        {item.priority === "urgent" && <AlertCircle className="h-3 w-3" />}
                        {item.priority}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        Target: {item.target_role.toUpperCase()}
                      </span>
                    </div>
                    {isAuthorOrAdmin && (
                      <button
                        onClick={() => deleteMutation.mutate(item.id)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Delete announcement"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <h3 className="mt-3 text-base font-bold text-ink tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 whitespace-pre-line">{item.content}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Post Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-modal border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Megaphone className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-ink">Publish Announcement</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="field-label">Headline Title</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Midterm Examination Schedule Released"
                  className="field-control"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Target Audience</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as "all" | "student" | "professor")}
                    className="field-control"
                  >
                    <option value="all">Everyone (All)</option>
                    <option value="student">Students Only</option>
                    <option value="professor">Professors Only</option>
                  </select>
                </div>

                <div>
                  <label className="field-label">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as "low" | "normal" | "urgent")}
                    className="field-control"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="field-label">Announcement Content</label>
                <textarea
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Provide all relevant information, timings, guidelines, and deadlines..."
                  className="field-control"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  <Send className="h-3.5 w-3.5" />
                  {createMutation.isPending ? "Posting..." : "Publish Announcement"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
