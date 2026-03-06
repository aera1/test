 "use client";

import { useEffect, useMemo, useReducer, useState } from "react";

type Day = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type Todo = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
  day: Day;
  date: string;
};

type Filter = "all" | "active" | "completed";

type TodoViewMode = "list" | "calendar" | "kanban";

type State = {
  todos: Todo[];
};

type Action =
  | { type: "ADD"; title: string; day: Day }
  | { type: "TOGGLE"; id: string }
  | { type: "DELETE"; id: string }
  | { type: "EDIT"; id: string; title: string }
  | { type: "CLEAR_COMPLETED" }
  | { type: "HYDRATE"; todos: Todo[] };

const STORAGE_KEY = "next-weekly-todo-list";

type EntryType = "income" | "expense";

type AccountEntry = {
  id: string;
  date: string; // YYYY-MM-DD
  type: EntryType;
  category: string;
  amount: number;
  memo?: string;
};

const ACCOUNT_STORAGE_KEY = "next-simple-account-book";

const DEFAULT_CATEGORIES: { type: EntryType; label: string }[] = [
  { type: "expense", label: "식비" },
  { type: "expense", label: "교통" },
  { type: "expense", label: "생활" },
  { type: "expense", label: "쇼핑" },
  { type: "expense", label: "취미" },
  { type: "income", label: "급여" },
  { type: "income", label: "용돈" },
  { type: "income", label: "기타 수입" },
];

function getToday(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthKey(date: string): string {
  // date: YYYY-MM-DD
  return date.slice(0, 7);
}

function getDateFromTimestamp(timestamp: number): string {
  const d = new Date(timestamp);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const DAYS: { id: Day; label: string; short: string }[] = [
  { id: "mon", label: "월요일", short: "월" },
  { id: "tue", label: "화요일", short: "화" },
  { id: "wed", label: "수요일", short: "수" },
  { id: "thu", label: "목요일", short: "목" },
  { id: "fri", label: "금요일", short: "금" },
  { id: "sat", label: "토요일", short: "토" },
  { id: "sun", label: "일요일", short: "일" },
];

function getDayFromDate(date: Date): Day {
  const dayIndex = date.getDay(); // 0:일 ~ 6:토
  switch (dayIndex) {
    case 0:
      return "sun";
    case 1:
      return "mon";
    case 2:
      return "tue";
    case 3:
      return "wed";
    case 4:
      return "thu";
    case 5:
      return "fri";
    case 6:
    default:
      return "sat";
  }
}

function todosReducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return {
        todos: action.todos.map((todo) => {
          const base = todo as Todo;
          const withDay = base.day
            ? base
            : { ...base, day: getDayFromDate(new Date(base.createdAt)) };
          if (withDay.date) return withDay;
          return { ...withDay, date: getDateFromTimestamp(withDay.createdAt) };
        }),
      };
    case "ADD": {
      const trimmed = action.title.trim();
      if (!trimmed) return state;
      const newTodo: Todo = {
        id: crypto.randomUUID(),
        title: trimmed,
        completed: false,
        createdAt: Date.now(),
        day: action.day,
        date: getToday(),
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
  const [todoViewMode, setTodoViewMode] = useState<TodoViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Day>(() => {
    if (typeof window === "undefined") return "mon";
    return getDayFromDate(new Date());
  });

  const [entries, setEntries] = useState<AccountEntry[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as AccountEntry[];
    } catch {
      return [];
    }
  });
  const [entryDate, setEntryDate] = useState<string>(() => getToday());
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [entryCategory, setEntryCategory] = useState<string>("식비");
  const [entryAmount, setEntryAmount] = useState<string>("");
  const [entryMemo, setEntryMemo] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    getMonthKey(getToday()),
  );

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

  // 가계부 저장
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const remainingCount = useMemo(() => {
    const base = state.todos.filter((t) => t.day === selectedDay);
    const byDate =
      selectedDate != null
        ? base.filter((t) => t.date === selectedDate)
        : base;
    return byDate.filter((t) => !t.completed).length;
  }, [state.todos, selectedDay, selectedDate]);

  const filteredTodos = useMemo(() => {
    const byDay = state.todos.filter((t) => t.day === selectedDay);
    const byDate =
      selectedDate != null
        ? byDay.filter((t) => t.date === selectedDate)
        : byDay;
    switch (filter) {
      case "active":
        return byDate.filter((t) => !t.completed);
      case "completed":
        return byDate.filter((t) => t.completed);
      default:
        return byDate;
    }
  }, [state.todos, filter, selectedDay, selectedDate]);

  const handleAdd = () => {
    if (!input.trim()) return;
    dispatch({ type: "ADD", title: input, day: selectedDay });
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

  const currentMonthEntries = useMemo(
    () => entries.filter((e) => getMonthKey(e.date) === selectedMonth),
    [entries, selectedMonth],
  );

  const monthlySummary = useMemo(() => {
    return currentMonthEntries.reduce(
      (acc, e) => {
        if (e.type === "income") {
          acc.income += e.amount;
        } else {
          acc.expense += e.amount;
        }
        return acc;
      },
      { income: 0, expense: 0 },
    );
  }, [currentMonthEntries]);

  const handleAddEntry = () => {
    const amount = Number(entryAmount.replace(/,/g, ""));
    if (!entryDate || !amount || amount <= 0) return;

    const newEntry: AccountEntry = {
      id: crypto.randomUUID(),
      date: entryDate,
      type: entryType,
      category: entryCategory || (entryType === "income" ? "기타 수입" : "기타"),
      amount,
      memo: entryMemo.trim() || undefined,
    };

    setEntries((prev) => [newEntry, ...prev]);
    setEntryAmount("");
    setEntryMemo("");
    setSelectedMonth(getMonthKey(entryDate));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-white px-4 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            알잘딱
          </h1>
          <p className="text-sm text-slate-500">
            한 주의 할 일과 지출을 알아서 잘 딱 깔끔하게 정리해 보세요.
          </p>
        </header>

        <main className="grid gap-6 md:grid-cols-[1.4fr,1.1fr]">
          <section className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm backdrop-blur">
          <section className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 rounded-full bg-slate-50 p-1">
              {DAYS.map((day) => (
                <DayButton
                  key={day.id}
                  label={day.short}
                  fullLabel={day.label}
                  active={selectedDay === day.id}
                  onClick={() => {
                    setSelectedDay(day.id);
                    setSelectedDate(null);
                  }}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400">
              선택된 요일:{" "}
              {DAYS.find((d) => d.id === selectedDay)?.label ?? "월요일"}
            </span>
          </section>

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
                placeholder="선택한 요일의 할 일을 입력하고 Enter 또는 추가 버튼을 눌러보세요"
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

              <div className="flex items-center gap-2">
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
                <div className="hidden items-center gap-1 rounded-full bg-slate-50 p-1 sm:flex">
                  <ViewModeButton
                    label="리스트"
                    active={todoViewMode === "list"}
                    onClick={() => setTodoViewMode("list")}
                  />
                  <ViewModeButton
                    label="달력"
                    active={todoViewMode === "calendar"}
                    onClick={() => setTodoViewMode("calendar")}
                  />
                  <ViewModeButton
                    label="주간"
                    active={todoViewMode === "kanban"}
                    onClick={() => setTodoViewMode("kanban")}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4 space-y-2">
            {todoViewMode === "list" ? (
              <>
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
              </>
            ) : todoViewMode === "calendar" ? (
              <TodoCalendar
                todos={state.todos}
                month={selectedMonth}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setTodoViewMode("list");
                  const dateObj = new Date(date);
                  setSelectedDay(getDayFromDate(dateObj));
                }}
              />
            ) : (
              <WeeklyKanban
                todos={state.todos}
                filter={filter}
                selectedDay={selectedDay}
                onSelectDay={(day) => {
                  setSelectedDay(day);
                  setSelectedDate(null);
                  setTodoViewMode("list");
                }}
              />
            )}
          </section>
          </section>

          <section className="rounded-2xl border border-sky-100 bg-white/90 p-5 shadow-sm backdrop-blur">
            <h2 className="mb-1 text-base font-semibold text-slate-900">
              간단 가계부
            </h2>
            <p className="mb-4 text-xs text-slate-500">
              월별로 수입과 지출을 기록하고 합계를 확인해 보세요.
            </p>

            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <label className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <span className="text-slate-500">조회 월</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-xs text-slate-800 outline-none"
                />
              </label>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-sky-50 px-3 py-2">
                <p className="text-[11px] text-sky-700">이번 달 수입</p>
                <p className="mt-1 text-sm font-semibold text-sky-900">
                  {monthlySummary.income.toLocaleString()}원
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 px-3 py-2">
                <p className="text-[11px] text-rose-700">이번 달 지출</p>
                <p className="mt-1 text-sm font-semibold text-rose-900">
                  {monthlySummary.expense.toLocaleString()}원
                </p>
              </div>
              <div className="rounded-xl bg-emerald-50 px-3 py-2">
                <p className="text-[11px] text-emerald-700">이번 달 잔액</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {(monthlySummary.income - monthlySummary.expense).toLocaleString()}
                  원
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2 rounded-xl bg-slate-50/70 p-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none ring-sky-300 focus:ring-2"
                />
                <select
                  value={entryType}
                  onChange={(e) => {
                    const nextType = e.target.value as EntryType;
                    setEntryType(nextType);
                    const fallback =
                      nextType === "income" ? "급여" : "식비";
                    if (
                      !DEFAULT_CATEGORIES.some(
                        (c) => c.type === nextType && c.label === entryCategory,
                      )
                    ) {
                      setEntryCategory(fallback);
                    }
                  }}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none ring-sky-300 focus:ring-2"
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
                <select
                  value={entryCategory}
                  onChange={(e) => setEntryCategory(e.target.value)}
                  className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none ring-sky-300 focus:ring-2"
                >
                  {DEFAULT_CATEGORIES.filter(
                    (c) => c.type === entryType,
                  ).map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  inputMode="decimal"
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(e.target.value)}
                  placeholder="금액"
                  className="h-8 w-24 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none ring-sky-300 focus:w-28 focus:ring-2"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={entryMemo}
                  onChange={(e) => setEntryMemo(e.target.value)}
                  placeholder="메모를 입력해 주세요 (선택)"
                  className="h-8 flex-1 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none ring-sky-300 focus:ring-2"
                />
                <button
                  type="button"
                  onClick={handleAddEntry}
                  className="inline-flex h-8 items-center justify-center rounded-lg bg-sky-500 px-3 text-xs font-medium text-white shadow-sm transition hover:bg-sky-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                >
                  기록
                </button>
              </div>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto border-t border-slate-100 pt-2 text-xs">
              {currentMonthEntries.length === 0 ? (
                <p className="py-6 text-center text-slate-400">
                  선택한 월에 기록된 내역이 없습니다. 첫 가계부 항목을 추가해 보세요.
                </p>
              ) : (
                currentMonthEntries.map((e) => (
                  <div
                    key={e.id}
                    className="group flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-slate-50"
                  >
                    <div className="w-16 text-[11px] text-slate-400">
                      {e.date.slice(5).replace("-", "/")}
                    </div>
                    <div
                      className={`inline-flex min-w-[40px] items-center justify-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        e.type === "income"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {e.type === "income" ? "수입" : "지출"}
                    </div>
                    <div className="w-16 text-[11px] text-slate-600">
                      {e.category}
                    </div>
                    <div className="flex-1 text-right text-[11px] font-semibold">
                      {e.type === "income" ? "+" : "-"}
                      {e.amount.toLocaleString()}원
                    </div>
                    {e.memo && (
                      <div className="max-w-[120px] flex-1 truncate text-[11px] text-slate-400">
                        {e.memo}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(e.id)}
                      className="ml-1 hidden rounded-md px-2 py-1 text-[10px] text-slate-400 hover:bg-rose-50 hover:text-rose-500 group-hover:inline-flex"
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
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

type ViewModeButtonProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

function ViewModeButton({ label, active, onClick }: ViewModeButtonProps) {
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

type DayButtonProps = {
  label: string;
  fullLabel: string;
  active: boolean;
  onClick: () => void;
};

function DayButton({ label, fullLabel, active, onClick }: DayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={fullLabel}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-sky-500 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}

type TodoCalendarProps = {
  todos: Todo[];
  month: string; // YYYY-MM
  onSelectDate: (date: string) => void;
};

function TodoCalendar({ todos, month, onSelectDate }: TodoCalendarProps) {
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDay = new Date(year, monthIndex - 1, 1);
  const firstWeekday = firstDay.getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, monthIndex, 0).getDate();

  const weeks: Array<Array<number | null>> = [];
  let currentWeek: Array<number | null> = [];

  for (let i = 0; i < firstWeekday; i += 1) {
    currentWeek.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const todosByDate = useMemo(() => {
    const map: Record<string, Todo[]> = {};
    todos.forEach((todo) => {
      const key = todo.date || getDateFromTimestamp(todo.createdAt);
      if (!key.startsWith(month)) return;
      if (!map[key]) map[key] = [];
      map[key].push(todo);
    });
    return map;
  }, [todos, month]);

  const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-1">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-rows-6 gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day, di) => {
              if (!day) {
                return (
                  <div
                    key={`${wi}-${di}`}
                    className="h-20 rounded-xl border border-dashed border-slate-100 bg-slate-50/40"
                  />
                );
              }
              const dayStr = String(day).padStart(2, "0");
              const dateKey = `${month}-${dayStr}`;
              const dayTodos = todosByDate[dateKey] ?? [];
              const hasTodos = dayTodos.length > 0;
              return (
                <button
                  key={`${wi}-${di}`}
                  type="button"
                  onClick={() => onSelectDate(dateKey)}
                  className={`flex h-20 flex-col rounded-xl border px-2 py-1 text-left text-[11px] ${
                    hasTodos
                      ? "border-sky-100 bg-sky-50/70"
                      : "border-slate-100 bg-slate-50/40"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-700">
                      {day}
                    </span>
                    {hasTodos && (
                      <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[9px] font-medium text-white">
                        {dayTodos.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayTodos.slice(0, 2).map((todo) => (
                      <div
                        key={todo.id}
                        className={`truncate rounded-md px-1 py-0.5 text-[10px] ${
                          todo.completed
                            ? "bg-slate-200 text-slate-500 line-through"
                            : "bg-white text-slate-700"
                        }`}
                      >
                        {todo.title}
                      </div>
                    ))}
                    {dayTodos.length > 2 && (
                      <div className="truncate text-[9px] text-slate-400">
                        + {dayTodos.length - 2}개 더 보기
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

type WeeklyKanbanProps = {
  todos: Todo[];
  filter: Filter;
  selectedDay: Day;
  onSelectDay: (day: Day) => void;
};

function WeeklyKanban({
  todos,
  filter,
  selectedDay,
  onSelectDay,
}: WeeklyKanbanProps) {
  const todosByDay = useMemo(() => {
    const map: Record<Day, Todo[]> = {
      mon: [],
      tue: [],
      wed: [],
      thu: [],
      fri: [],
      sat: [],
      sun: [],
    };
    todos.forEach((todo) => {
      map[todo.day].push(todo);
    });
    return map;
  }, [todos]);

  const applyFilter = (items: Todo[]) => {
    switch (filter) {
      case "active":
        return items.filter((t) => !t.completed);
      case "completed":
        return items.filter((t) => t.completed);
      default:
        return items;
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-400">
        이번 주 전체를 한 번에 보고 싶을 때 사용하는 뷰입니다. 요일 헤더를 클릭하면 해당
        요일 리스트로 이동합니다.
      </p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {DAYS.map((day) => {
          const list = applyFilter(todosByDay[day.id]);
          const isToday = selectedDay === day.id;
          return (
            <div
              key={day.id}
              className={`flex min-h-[140px] flex-col rounded-xl border bg-slate-50/60 p-2 ${
                isToday ? "border-sky-300 bg-sky-50/80" : "border-slate-100"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day.id)}
                className="mb-2 flex items-center justify-between text-left"
              >
                <span className="text-[11px] font-semibold text-slate-700">
                  {day.label}
                </span>
                <span className="rounded-full bg-slate-900/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                  {list.length}개
                </span>
              </button>
              <div className="flex-1 space-y-1 overflow-y-auto">
                {list.length === 0 ? (
                  <p className="py-4 text-center text-[10px] text-slate-300">
                    할 일이 없습니다.
                  </p>
                ) : (
                  list.map((todo) => (
                    <div
                      key={todo.id}
                      className={`truncate rounded-md px-2 py-1 text-[10px] ${
                        todo.completed
                          ? "bg-slate-200 text-slate-500 line-through"
                          : "bg-white text-slate-700"
                      }`}
                    >
                      {todo.title}
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
