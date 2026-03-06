 "use client";

import { useEffect, useMemo, useReducer, useState } from "react";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
};

type Filter = "all" | "active" | "completed";

type State = {
  todos: Todo[];
};

type Action =
  | { type: "ADD"; title: string }
  | { type: "TOGGLE"; id: string }
  | { type: "DELETE"; id: string }
  | { type: "EDIT"; id: string; title: string }
  | { type: "CLEAR_COMPLETED" }
  | { type: "HYDRATE"; todos: Todo[] };

const STORAGE_KEY = "next-todo-list";

function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { todos: action.todos };
    case "ADD": {
      const trimmed = action.title.trim();
      if (!trimmed) return state;
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        title: trimmed,
        completed: false,
        createdAt: Date.now(),
      };
      return { todos: [newTodo, ...state.todos] };
    }
    case "TOGGLE":
      return {
        todos: state.todos.map((todo) =>
          todo.id === action.id
            ? { ...todo, completed: !todo.completed }
            : todo,
        ),
      };
    case "DELETE":
      return {
        todos: state.todos.filter((todo) => todo.id !== action.id),
      };
    case "EDIT":
      return {
        todos: state.todos.map((todo) =>
          todo.id === action.id ? { ...todo, title: action.title.trim() } : todo,
        ),
      };
    case "CLEAR_COMPLETED":
      return { todos: state.todos.filter((todo) => !todo.completed) };
    default:
      return state;
  }
}

export default function Home() {
  const [state, dispatch] = useReducer(todosReducer, { todos: [] });
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");

  // 초기 로컬 스토리지 데이터 불러오기
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Todo[];
      dispatch({ type: "HYDRATE", todos: parsed });
    } catch {
      // ignore
    }
  }, []);

  // 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
  }, [state.todos]);

  const remainingCount = useMemo(
    () => state.todos.filter((t) => !t.completed).length,
    [state.todos],
  );

  const filteredTodos = useMemo(() => {
    switch (filter) {
      case "active":
        return state.todos.filter((t) => !t.completed);
      case "completed":
        return state.todos.filter((t) => t.completed);
      default:
        return state.todos;
    }
  }, [state.todos, filter]);

  const handleAdd = () => {
    if (!input.trim()) return;
    dispatch({ type: "ADD", title: input });
    setInput("");
  };

  const handleEditSubmit = (id: string) => {
    const trimmed = editingValue.trim();
    if (!trimmed) {
      dispatch({ type: "DELETE", id });
    } else {
      dispatch({ type: "EDIT", id, title: trimmed });
    }
    setEditingId(null);
    setEditingValue("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            나의 투두 리스트
          </h1>
          <p className="text-sm text-slate-500">
            해야 할 일을 적고, 완료한 일은 체크해서 정리해 보세요.
          </p>
        </header>

        <main className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm backdrop-blur">
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="할 일을 입력하고 Enter 또는 추가 버튼을 눌러보세요"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-sky-400 transition focus:bg-white focus:ring-2"
              />
              <button
                type="button"
                onClick={handleAdd}
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-sky-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:mt-0"
              >
                추가
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-full bg-sky-50 px-2 text-[11px] font-medium text-sky-700">
                  남은 일 {remainingCount}개
                </span>
                {state.todos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => dispatch({ type: "CLEAR_COMPLETED" })}
                    className="text-[11px] text-slate-400 underline-offset-2 hover:text-sky-600 hover:underline"
                  >
                    완료 항목 비우기
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 rounded-full bg-slate-50 p-1">
                <FilterButton
                  label="전체"
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                />
                <FilterButton
                  label="진행 중"
                  active={filter === "active"}
                  onClick={() => setFilter("active")}
                />
                <FilterButton
                  label="완료"
                  active={filter === "completed"}
                  onClick={() => setFilter("completed")}
                />
              </div>
            </div>
          </section>

          <section className="mt-4 space-y-2">
            {filteredTodos.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                아직 등록된 할 일이 없어요. 오늘의 첫 할 일을 추가해 보세요.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {filteredTodos.map((todo) => {
                  const isEditing = editingId === todo.id;
                  return (
                    <li
                      key={todo.id}
                      className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm transition hover:border-sky-100 hover:bg-sky-50/80"
                    >
                      <button
                        type="button"
                        onClick={() => dispatch({ type: "TOGGLE", id: todo.id })}
                        className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] text-sky-600 transition group-hover:border-sky-400 group-hover:text-sky-500"
                        aria-label={todo.completed ? "할 일 되돌리기" : "할 일 완료"}
                      >
                        {todo.completed && "✓"}
                      </button>

                      <div className="flex-1">
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            onBlur={() => handleEditSubmit(todo.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleEditSubmit(todo.id);
                              }
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingValue("");
                              }
                            }}
                            className="w-full rounded-md border border-sky-200 bg-white px-2 py-1 text-sm outline-none ring-sky-300 focus:ring-2"
                          />
                        ) : (
                          <p
                            className={`cursor-text break-words text-[13px] ${
                              todo.completed
                                ? "text-slate-400 line-through"
                                : "text-slate-800"
                            }`}
                            onDoubleClick={() => {
                              setEditingId(todo.id);
                              setEditingValue(todo.title);
                            }}
                          >
                            {todo.title}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(todo.id);
                              setEditingValue(todo.title);
                            }}
                            className="rounded-md px-2 py-1 text-[11px] text-sky-600 hover:bg-sky-50"
                          >
                            수정
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => dispatch({ type: "DELETE", id: todo.id })}
                          className="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                        >
                          삭제
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

type FilterButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function FilterButton({ label, active, onClick }: FilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-sky-500 text-white shadow-sm"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );
}
