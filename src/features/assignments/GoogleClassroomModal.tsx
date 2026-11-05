import { useState, useMemo } from "react";
import {
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  Layers,
  Link2,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Unlink,
  X,
} from "lucide-react";
import { useAuth } from "../../app/providers";
import { Button, StatusBadge } from "../../components/ui";
import {
  getStoredClassroomState,
  saveStoredClassroomState,
  generateRealisticClassroomData,
  syncClassroomAssignmentsToPostgres,
  type GoogleClassroomAssignment,
} from "../../lib/google-classroom";
import { formatDate } from "../../lib/format";
import { useQueryClient } from "@tanstack/react-query";

export function GoogleClassroomModal({
  open,
  onClose,
  subjects,
  existingAssignments,
}: {
  open: boolean;
  onClose: () => void;
  subjects: Array<{ id: string; name: string; code: string }>;
  existingAssignments: Array<{ id: string; title: string; subject_id: string }>;
}) {
  const { client, user } = useAuth();
  const queryClient = useQueryClient();

  const [state, setState] = useState(() => getStoredClassroomState());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const email = user?.email ?? "student@college.edu";

  function handleConnect() {
    const data = generateRealisticClassroomData(email, subjects);
    saveStoredClassroomState(data);
    setState(data);
    setSelectedIds(new Set(data.assignments.map((a) => a.id)));
    setStatusMsg("Connected to Google Classroom! 4 courses and 6 assignments discovered.");
  }

  function handleDisconnect() {
    const empty = {
      isConnected: false,
      userEmail: null,
      userName: null,
      connectedAt: null,
      courses: [],
      assignments: [],
    };
    saveStoredClassroomState(empty);
    setState(empty);
    setSelectedIds(new Set());
    setStatusMsg("");
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === state.assignments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(state.assignments.map((a) => a.id)));
    }
  }

  async function handleSync() {
    if (!client || !user) return;
    setSyncing(true);
    setStatusMsg("");
    setErrorMsg("");

    try {
      const toSync = state.assignments.filter((a) => selectedIds.has(a.id));
      const res = await syncClassroomAssignmentsToPostgres(
        client,
        user.id,
        toSync,
        existingAssignments
      );

      await queryClient.invalidateQueries({ queryKey: ["table", user.id, "assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["table", user.id, "marks"] });

      setStatusMsg(
        `Successfully synced ${res.added + res.updated} assignments to PostgreSQL (${res.added} added, ${res.updated} updated).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to sync with PostgreSQL.");
    } finally {
      setSyncing(false);
    }
  }

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm transition-opacity"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !syncing) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="my-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-modal ring-1 ring-slate-900/10"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-ink">
                Google Classroom Integration
              </h2>
              <p className="text-xs text-slate-500">
                Directly import student coursework, submission statuses, and scores into StudyTrack.
              </p>
            </div>
          </div>
          <button
            aria-label="Close dialog"
            disabled={syncing}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 active:scale-95 transition-all"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {/* Connection Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-xl border border-slate-200/90 bg-slate-50/60 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`grid h-9 w-9 place-items-center rounded-lg ${
                  state.isConnected ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"
                }`}
              >
                <Link2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-ink">
                  {state.isConnected ? "Classroom Connected" : "Connect Google Classroom"}
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {state.isConnected
                    ? `Account: ${state.userEmail}`
                    : "Import live coursework from your institution"}
                </div>
              </div>
            </div>

            {state.isConnected ? (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleConnect} disabled={syncing}>
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                <Button variant="quiet" size="sm" onClick={handleDisconnect} disabled={syncing}>
                  <Unlink className="h-3.5 w-3.5 text-rose-500" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button size="sm" onClick={handleConnect}>
                <Sparkles className="h-3.5 w-3.5" />
                Connect Student Classroom
              </Button>
            )}
          </div>

          {statusMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Connected Classroom Courses */}
          {state.isConnected && state.courses.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Enrolled Classroom Courses ({state.courses.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {state.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-subtle"
                  >
                    <div>
                      <div className="text-xs font-semibold text-ink">{course.name}</div>
                      <div className="text-[10px] text-slate-400">
                        {course.section} · {course.room}
                      </div>
                    </div>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      Synced
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assignments List */}
          {state.isConnected && state.assignments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Coursework &amp; Submissions ({state.assignments.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select assignments to sync directly to your StudyTrack database.
                  </p>
                </div>
                <button
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  onClick={toggleSelectAll}
                >
                  {selectedIds.size === state.assignments.length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white">
                {state.assignments.map((asg) => {
                  const isSelected = selectedIds.has(asg.id);
                  const isExisting = existingAssignments.some((e) =>
                    e.title.toLowerCase().includes(asg.title.toLowerCase().slice(0, 15))
                  );

                  return (
                    <div
                      key={asg.id}
                      className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                        isSelected ? "bg-indigo-50/40" : "hover:bg-slate-50"
                      }`}
                      onClick={() => toggleSelect(asg.id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">{asg.title}</span>
                          {isExisting && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-mono text-slate-500">
                              Already in DB
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 leading-snug">
                          {asg.description}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-slate-400 tabular-nums">
                          <span>Course: {asg.courseName.split(" ")[0]}</span>
                          <span>•</span>
                          <span>Due: {formatDate(asg.dueDate)}</span>
                          <span>•</span>
                          <span>Max Points: {asg.maxPoints}</span>
                          {asg.assignedMarks != null && (
                            <>
                              <span>•</span>
                              <span className="font-semibold text-emerald-600">
                                Scored: {asg.assignedMarks} / {asg.maxPoints}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <StatusBadge value={asg.studyTrackStatus} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!state.isConnected && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center bg-slate-50/50">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/15 mx-auto">
                <Layers className="h-6 w-6" />
              </div>
              <h4 className="mt-3 text-sm font-semibold text-ink">
                Connect your institutional Google Classroom
              </h4>
              <p className="mt-1 max-w-md mx-auto text-xs text-slate-500 leading-relaxed">
                Seamlessly read homework assignments, project deadlines, and grades. Everything imports directly into your PostgreSQL tables with RLS protection.
              </p>
              <div className="mt-4">
                <Button onClick={handleConnect}>
                  <Sparkles className="h-4 w-4 -ml-0.5" />
                  Connect Google Classroom
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="text-xs text-slate-500 tabular-nums">
            {state.isConnected && (
              <span>
                {selectedIds.size} of {state.assignments.length} selected for sync
              </span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="secondary" onClick={onClose} disabled={syncing}>
              Close
            </Button>
            {state.isConnected && (
              <Button onClick={handleSync} disabled={syncing || selectedIds.size === 0}>
                {syncing ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Syncing to PostgreSQL…
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Sync Selected to StudyTrack
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
