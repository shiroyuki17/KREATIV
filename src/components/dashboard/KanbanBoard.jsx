import { useCallback, useEffect, useState } from "react";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { fetchTasks, createTask, updateTask, deleteTask } from "../../lib/taskApi.js";
import { getAccessToken } from "../../lib/authApi.js";

const COLUMNS = [
  { id: "TODO", label: "To-Do", dot: "bg-white/30" },
  { id: "IN_PROGRESS", label: "In Progress", dot: "bg-neon" },
  { id: "IN_REVIEW", label: "In Review", dot: "bg-amber-400" },
  { id: "DONE", label: "Done", dot: "bg-mint" },
];

// PRD FR-3.1: гэрээ бүрийн Kanban ажлын самбар. Native HTML5 drag-and-drop
// ашигладаг (шинэ dependency нэмэхгүй) — картыг чирж багана хооронд шилжүүлэхэд
// эхлээд UI-г оптимистоор шинэчилж, дараа нь backend рүү PATCH явуулна;
// алдаа гарвал бодит өгөгдлөөр дахин sync хийнэ.
export default function KanbanBoard({ contractId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftFor, setDraftFor] = useState(null);
  const [draftText, setDraftText] = useState("");
  const [dragId, setDragId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchTasks(contractId, getAccessToken())
      .then((res) => setTasks(res.tasks))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [contractId]);

  useEffect(() => {
    load();
  }, [load]);

  const byColumn = (status) => tasks.filter((t) => t.status === status).sort((a, b) => a.order - b.order);

  const addTask = async (status) => {
    const title = draftText.trim();
    setDraftFor(null);
    setDraftText("");
    if (!title) return;
    try {
      const task = await createTask(contractId, { title }, getAccessToken());
      setTasks((t) => [...t, task]);
    } catch (err) {
      setError(err.message);
    }
  };

  const moveTask = async (id, status) => {
    const current = tasks.find((t) => t.id === id);
    if (!current || current.status === status) return;
    setTasks((t) => t.map((x) => (x.id === id ? { ...x, status } : x)));
    try {
      await updateTask(id, { status }, getAccessToken());
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  const removeTask = async (id) => {
    setTasks((t) => t.filter((x) => x.id !== id));
    try {
      await deleteTask(id, getAccessToken());
    } catch (err) {
      setError(err.message);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-brand-soft" />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11.5px] font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) moveTask(dragId, col.id);
              setDragId(null);
            }}
            className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
          >
            <div className="flex items-center justify-between px-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-white/50">
                <span className={`h-1.5 w-1.5 rounded-full ${col.dot}`} />
                {col.label}
              </span>
              <span className="text-[10.5px] text-white/30">{byColumn(col.id).length}</span>
            </div>

            <div className="mt-2.5 min-h-[40px] space-y-2">
              {byColumn(col.id).map((t) => (
                <div
                  key={t.id}
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  className="group cursor-grab rounded-lg border border-white/8 bg-[#0d1512] p-2.5 text-[12.5px] leading-snug text-white/80 transition-colors hover:border-white/20 active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span>{t.title}</span>
                    <button
                      onClick={() => removeTask(t.id)}
                      aria-label="Delete task"
                      className="shrink-0 text-white/20 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {draftFor === col.id ? (
              <input
                autoFocus
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTask(col.id);
                  if (e.key === "Escape") {
                    setDraftFor(null);
                    setDraftText("");
                  }
                }}
                onBlur={() => addTask(col.id)}
                placeholder="Ажлын нэр…"
                className="mt-2 w-full rounded-lg border border-brand/40 bg-white/[0.04] px-2.5 py-2 text-[12.5px] outline-none placeholder:text-white/30"
              />
            ) : (
              <button
                onClick={() => setDraftFor(col.id)}
                className="mt-2 flex w-full items-center gap-1.5 rounded-lg px-2.5 py-2 text-[11.5px] font-medium text-white/35 transition-colors hover:bg-white/5 hover:text-white/70"
              >
                <Plus className="h-3.5 w-3.5" /> Add card
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
