(() => {
  "use strict";

  const STORAGE_TODOS = "owndo.todos";
  const STORAGE_SETTINGS = "owndo.settings";

  const DEFAULT_SETTINGS = {
    theme: "system",
    accent: "pine",
    density: "cozy",
    corners: "rounded",
    font: "sans",
    sortBy: "manual",
  };

  const PRIORITIES = ["none", "low", "medium", "high"];
  const PRIORITY_RANK = { high: 3, medium: 2, low: 1, none: 0 };
  const REPEATS = ["none", "daily", "weekly", "monthly"];
  const STATUSES = ["todo", "doing", "done"];

  /* ---------------------------------------------------------
     Storage helpers — everything lives in localStorage only.
     --------------------------------------------------------- */
  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function normalizeTodo(t) {
    if (!t || typeof t !== "object") return null;
    const text = typeof t.text === "string" ? t.text.trim() : "";
    if (!text) return null;
    const createdAt = typeof t.createdAt === "number" ? t.createdAt : Date.now();
    const status = STATUSES.includes(t.status) ? t.status : t.completed ? "done" : "todo";
    return {
      id: typeof t.id === "string" && t.id ? t.id : uid(),
      text,
      status,
      notes: typeof t.notes === "string" ? t.notes : "",
      priority: PRIORITIES.includes(t.priority) ? t.priority : "none",
      dueDate: typeof t.dueDate === "string" && t.dueDate ? t.dueDate : null,
      repeat: REPEATS.includes(t.repeat) ? t.repeat : "none",
      favorite: Boolean(t.favorite),
      tags: Array.isArray(t.tags) ? [...new Set(t.tags.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()))] : [],
      subtasks: Array.isArray(t.subtasks)
        ? t.subtasks
            .filter((s) => s && typeof s.text === "string" && s.text.trim())
            .map((s) => ({ id: typeof s.id === "string" ? s.id : uid(), text: s.text.trim(), completed: Boolean(s.completed) }))
        : [],
      comments: Array.isArray(t.comments)
        ? t.comments
            .filter((c) => c && typeof c.text === "string" && c.text.trim())
            .map((c) => ({ id: typeof c.id === "string" ? c.id : uid(), text: c.text.trim(), createdAt: typeof c.createdAt === "number" ? c.createdAt : createdAt }))
        : [],
      createdAt,
      updatedAt: typeof t.updatedAt === "number" ? t.updatedAt : createdAt,
    };
  }

  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_TODOS);
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeTodo).filter(Boolean);
    } catch {
      return [];
    }
  }

  function saveTodos(list) {
    localStorage.setItem(STORAGE_TODOS, JSON.stringify(list));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(s) {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s));
  }

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */
  let todos = loadTodos();
  let settings = loadSettings();
  let query = "";
  let tagFilter = null;
  let favoritesOnly = false;
  let dragId = null;
  let pendingPriority = "none";
  let currentDetailId = null;
  let toastTimer = null;

  /* ---------------------------------------------------------
     DOM refs
     --------------------------------------------------------- */
  const root = document.documentElement;

  const appHeader = document.getElementById("appHeader");
  const appFooter = document.getElementById("appFooter");
  const listView = document.getElementById("listView");
  const detailView = document.getElementById("detailView");

  const addForm = document.getElementById("addForm");
  const addInput = document.getElementById("addInput");
  const addOptionsToggle = document.getElementById("addOptionsToggle");
  const addOptions = document.getElementById("addOptions");
  const addDue = document.getElementById("addDue");
  const addTags = document.getElementById("addTags");

  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const tagFilterBar = document.getElementById("tagFilterBar");
  const clearDoneBtn = document.getElementById("clearDoneBtn");

  const settingsBtn = document.getElementById("settingsBtn");
  const closeSettings = document.getElementById("closeSettings");
  const settingsPanel = document.getElementById("settingsPanel");
  const overlay = document.getElementById("overlay");

  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  const toastAction = document.getElementById("toastAction");

  const backBtn = document.getElementById("backBtn");
  const entryNumber = document.getElementById("entryNumber");
  const detailPageLeft = document.getElementById("detailPageLeft");
  const detailSettingsBtn = document.getElementById("detailSettingsBtn");
  const detailTitle = document.getElementById("detailTitle");
  const detailFavorite = document.getElementById("detailFavorite");
  const detailDelete = document.getElementById("detailDelete");
  const statusRow = document.getElementById("statusRow");
  const priorityRow = document.getElementById("priorityRow");
  const detailDue = document.getElementById("detailDue");
  const detailRepeat = document.getElementById("detailRepeat");
  const detailTags = document.getElementById("detailTags");
  const tagForm = document.getElementById("tagForm");
  const tagInput = document.getElementById("tagInput");
  const tagSuggestions = document.getElementById("tagSuggestions");
  const detailNotes = document.getElementById("detailNotes");
  const subtaskList = document.getElementById("subtaskList");
  const subtaskForm = document.getElementById("subtaskForm");
  const subtaskInput = document.getElementById("subtaskInput");
  const logScroll = document.getElementById("logScroll");
  const commentList = document.getElementById("commentList");
  const commentForm = document.getElementById("commentForm");
  const commentInput = document.getElementById("commentInput");
  const detailMeta = document.getElementById("detailMeta");

  const columns = {};
  STATUSES.forEach((status) => {
    columns[status] = {
      root: document.querySelector(`.kanban-column[data-status="${status}"]`),
      list: document.querySelector(`.column-list[data-list="${status}"]`),
      count: document.querySelector(`.column-count[data-count="${status}"]`),
      composerForm: document.querySelector(`.column-composer[data-composer="${status}"]`),
      composerInput: document.querySelector(`.column-composer[data-composer="${status}"] input`),
    };
  });

  /* ---------------------------------------------------------
     Small shared helpers
     --------------------------------------------------------- */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatDueLabel(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    const opts = { month: "short", day: "numeric" };
    if (date.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
    return date.toLocaleDateString(undefined, opts);
  }

  function formatDateTime(ms) {
    return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function setActiveButton(container, value) {
    container.querySelectorAll("[data-value]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-value") === value);
    });
  }

  function computeNextDue(dueDate, repeat) {
    const [y, m, d] = dueDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    if (repeat === "daily") date.setDate(date.getDate() + 1);
    else if (repeat === "weekly") date.setDate(date.getDate() + 7);
    else if (repeat === "monthly") date.setMonth(date.getMonth() + 1);
    else return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function findTodo(id) {
    return todos.find((t) => t.id === id) || null;
  }

  function currentTodo() {
    return currentDetailId ? findTodo(currentDetailId) : null;
  }

  function touch(todo) {
    todo.updatedAt = Date.now();
  }

  /* Sets a task's workflow status, spawning the next occurrence
     of a repeating task the moment it lands in Done. */
  function setStatus(todo, newStatus) {
    const wasDone = todo.status === "done";
    todo.status = newStatus;
    touch(todo);
    if (!wasDone && newStatus === "done" && todo.repeat !== "none" && todo.dueDate) {
      const nextDue = computeNextDue(todo.dueDate, todo.repeat);
      if (nextDue) {
        const clone = {
          ...todo,
          id: uid(),
          status: "todo",
          dueDate: nextDue,
          comments: [],
          subtasks: todo.subtasks.map((s) => ({ ...s, completed: false })),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        todos.unshift(clone);
      }
    }
  }

  /* ---------------------------------------------------------
     Toast (with optional undo action)
     --------------------------------------------------------- */
  function showToast(message, actionLabel, onAction) {
    toastMessage.textContent = message;
    clearTimeout(toastTimer);
    if (actionLabel && onAction) {
      toastAction.textContent = actionLabel;
      toastAction.hidden = false;
      toastAction.onclick = () => {
        toast.hidden = true;
        clearTimeout(toastTimer);
        onAction();
      };
      toastTimer = setTimeout(() => { toast.hidden = true; }, 6000);
    } else {
      toastAction.hidden = true;
      toastAction.onclick = null;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
    }
    toast.hidden = false;
  }

  /* ---------------------------------------------------------
     Routing — #/ for the board, #/todo/<id> for the detail page
     --------------------------------------------------------- */
  function parseRoute() {
    const match = location.hash.match(/^#\/todo\/(.+)$/);
    return match ? { view: "detail", id: decodeURIComponent(match[1]) } : { view: "list" };
  }

  function goTo(hash) {
    location.hash = hash;
  }

  function renderRoute() {
    const route = parseRoute();
    if (route.view === "detail" && findTodo(route.id)) {
      currentDetailId = route.id;
      appHeader.hidden = true;
      appFooter.hidden = true;
      listView.hidden = true;
      detailView.hidden = false;
      renderDetail();
    } else {
      currentDetailId = null;
      detailView.hidden = true;
      appHeader.hidden = false;
      appFooter.hidden = false;
      listView.hidden = false;
      document.title = "OwnDo — your local, private todo list";
      render();
    }
  }

  window.addEventListener("hashchange", renderRoute);
  backBtn.addEventListener("click", () => goTo("#/"));

  /* ---------------------------------------------------------
     Settings application
     --------------------------------------------------------- */
  function applySettings() {
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-density", settings.density);
    root.setAttribute("data-corners", settings.corners);
    root.setAttribute("data-font", settings.font);
    sortSelect.value = settings.sortBy;

    document.querySelectorAll("[data-setting]").forEach((group) => {
      const key = group.getAttribute("data-setting");
      if (key === "priority") return; // handled per-task, not a global setting
      setActiveButton(group, settings[key]);
    });
  }

  function updateSetting(key, value) {
    settings[key] = value;
    saveSettings(settings);
    applySettings();
  }

  document.querySelectorAll("#settingsPanel [data-setting]").forEach((group) => {
    const key = group.getAttribute("data-setting");
    group.querySelectorAll("[data-value]").forEach((btn) => {
      btn.addEventListener("click", () => updateSetting(key, btn.getAttribute("data-value")));
    });
  });

  sortSelect.addEventListener("change", () => {
    updateSetting("sortBy", sortSelect.value);
    render();
  });

  /* ---------------------------------------------------------
     Settings panel open/close
     --------------------------------------------------------- */
  let settingsTrigger = settingsBtn;

  function openSettings(trigger) {
    settingsTrigger = trigger || settingsBtn;
    settingsPanel.hidden = false;
    overlay.hidden = false;
    settingsTrigger.setAttribute("aria-expanded", "true");
    closeSettings.focus();
  }

  function closeSettingsPanel() {
    settingsPanel.hidden = true;
    overlay.hidden = true;
    settingsTrigger.setAttribute("aria-expanded", "false");
    settingsTrigger.focus();
  }

  settingsBtn.addEventListener("click", () => openSettings(settingsBtn));
  detailSettingsBtn.addEventListener("click", () => openSettings(detailSettingsBtn));
  closeSettings.addEventListener("click", closeSettingsPanel);
  overlay.addEventListener("click", closeSettingsPanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !settingsPanel.hidden) closeSettingsPanel();
  });

  /* ---------------------------------------------------------
     Quick-add options (priority / due date / tags)
     --------------------------------------------------------- */
  addOptionsToggle.addEventListener("click", () => {
    const willShow = addOptions.hidden;
    addOptions.hidden = !willShow;
    addOptionsToggle.setAttribute("aria-expanded", String(willShow));
  });

  addOptions.querySelectorAll('[data-pending="priority"] .option-btn').forEach((btn) => {
    btn.addEventListener("click", () => {
      pendingPriority = btn.getAttribute("data-value");
      setActiveButton(addOptions.querySelector('[data-pending="priority"]'), pendingPriority);
    });
  });
  setActiveButton(addOptions.querySelector('[data-pending="priority"]'), pendingPriority);

  /* ---------------------------------------------------------
     Filtering & sorting (status is a column now, not a filter)
     --------------------------------------------------------- */
  function matchesFilter(todo) {
    if (favoritesOnly && !todo.favorite) return false;
    if (tagFilter && !todo.tags.includes(tagFilter)) return false;
    if (query) {
      const haystack = [todo.text, todo.notes, ...todo.tags].join(" ").toLowerCase();
      if (!haystack.includes(query.toLowerCase())) return false;
    }
    return true;
  }

  function sortTodos(list) {
    const copy = [...list];
    switch (settings.sortBy) {
      case "priority":
        return copy.sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
      case "due":
        return copy.sort((a, b) => {
          if (a.dueDate && b.dueDate) return a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0;
          if (a.dueDate) return -1;
          if (b.dueDate) return 1;
          return 0;
        });
      case "created":
        return copy.sort((a, b) => b.createdAt - a.createdAt);
      case "alpha":
        return copy.sort((a, b) => a.text.localeCompare(b.text));
      default:
        return copy;
    }
  }

  /* ---------------------------------------------------------
     Board rendering
     --------------------------------------------------------- */
  const ICONS = {
    calendar: '<svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="4" width="14" height="13" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><line x1="3" y1="8" x2="17" y2="8" stroke="currentColor" stroke-width="1.4"/><line x1="6.5" y1="2.5" x2="6.5" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="13.5" y1="2.5" x2="13.5" y2="5.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
    checklist: '<svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 5.5l1.5 1.5L7 4M3 11.5 4.5 13 7 10M9 6h8M9 12h8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    comment: '<svg width="12" height="12" viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4.5h14v9H8l-4 3.5v-3.5H3v-9Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    star: '<svg width="16" height="16" viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5l2.35 4.76 5.25.76-3.8 3.7.9 5.23L10 14.5l-4.7 2.45.9-5.23-3.8-3.7 5.25-.76L10 2.5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-7 0 1 11h6l1-11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const EMPTY_TEXT = {
    todo: "Nothing here yet. Add your first task above.",
    doing: "Nothing in progress.",
    done: "Nothing done yet.",
  };

  function render() {
    STATUSES.forEach((status) => {
      const col = columns[status];
      let items = todos.filter((t) => t.status === status && matchesFilter(t));
      if (settings.sortBy !== "manual") items = sortTodos(items);

      col.list.innerHTML = "";
      if (items.length === 0) {
        col.list.innerHTML = `<li class="column-empty">${query || tagFilter || favoritesOnly ? "No cards match." : EMPTY_TEXT[status]}</li>`;
      } else {
        items.forEach((todo) => col.list.appendChild(renderCard(todo, status)));
      }
      col.count.textContent = String(todos.filter((t) => t.status === status).length);
    });

    clearDoneBtn.disabled = todos.filter((t) => t.status === "done").length === 0;
    renderTagFilterBar();
  }

  function renderTagFilterBar() {
    const allTags = [...new Set(todos.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b));
    const hasFavorites = todos.some((t) => t.favorite);

    if (allTags.length === 0 && !hasFavorites) {
      tagFilterBar.hidden = true;
      tagFilterBar.innerHTML = "";
      return;
    }

    tagFilterBar.hidden = false;
    let html = "";
    if (hasFavorites) {
      html += `<button type="button" class="tag-filter-chip${favoritesOnly ? " is-active" : ""}" data-fav="1">${ICONS.star} Favorites</button>`;
    }
    html += allTags
      .map((tag) => `<button type="button" class="tag-filter-chip${tagFilter === tag ? " is-active" : ""}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`)
      .join("");
    tagFilterBar.innerHTML = html;

    const favBtn = tagFilterBar.querySelector("[data-fav]");
    if (favBtn) favBtn.addEventListener("click", () => { favoritesOnly = !favoritesOnly; render(); });
    tagFilterBar.querySelectorAll("[data-tag]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-tag");
        tagFilter = tagFilter === t ? null : t;
        render();
      });
    });
  }

  function renderCard(todo) {
    const li = document.createElement("li");
    li.className = "kanban-card";
    li.dataset.id = todo.id;
    li.dataset.priority = todo.priority;
    li.draggable = true;
    li.tabIndex = 0;

    const overdue = todo.dueDate && todo.status !== "done" && todo.dueDate < todayStr();
    const dueToday = todo.dueDate && todo.dueDate === todayStr();
    const subtaskDone = todo.subtasks.filter((s) => s.completed).length;

    let metaHtml = "";
    if (todo.dueDate) {
      const cls = overdue ? "is-overdue" : dueToday ? "is-today" : "";
      metaHtml += `<span class="meta-badge due-badge ${cls}">${ICONS.calendar} ${formatDueLabel(todo.dueDate)}</span>`;
    }
    if (todo.subtasks.length > 0) {
      metaHtml += `<span class="meta-badge">${ICONS.checklist} ${subtaskDone}/${todo.subtasks.length}</span>`;
    }
    if (todo.comments.length > 0) {
      metaHtml += `<span class="meta-badge">${ICONS.comment} ${todo.comments.length}</span>`;
    }
    todo.tags.forEach((tag) => {
      metaHtml += `<span class="meta-tag">${escapeHtml(tag)}</span>`;
    });

    li.innerHTML = `
      <div class="card-top">
        <span class="card-title">${escapeHtml(todo.text)}</span>
        <div class="card-actions">
          <button class="favorite-btn${todo.favorite ? " is-active" : ""}" type="button" aria-label="${todo.favorite ? "Remove from favorites" : "Add to favorites"}">${ICONS.star}</button>
          <button class="delete-btn" type="button" aria-label="Delete task">${ICONS.trash}</button>
        </div>
      </div>
      ${metaHtml ? `<div class="card-meta">${metaHtml}</div>` : ""}
    `;

    const open = () => goTo(`#/todo/${encodeURIComponent(todo.id)}`);
    li.addEventListener("click", (e) => {
      if (e.target.closest(".card-actions")) return;
      open();
    });
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.target.closest(".card-actions")) open();
    });
    li.querySelector(".favorite-btn").addEventListener("click", () => { toggleFavorite(todo.id); render(); });
    li.querySelector(".delete-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteWithUndo(todo.id);
    });

    li.addEventListener("dragstart", (e) => {
      dragId = todo.id;
      li.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    li.addEventListener("dragend", () => {
      li.classList.remove("is-dragging");
      clearDragIndicators();
    });

    return li;
  }

  function clearDragIndicators() {
    document.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach((el) => el.classList.remove("drag-over-top", "drag-over-bottom"));
  }

  /* Column-level drag targets — set up once; they read live
     state (dragId, sort mode) at drop time via closures. */
  STATUSES.forEach((status) => {
    const col = columns[status];

    col.list.addEventListener("dragover", (e) => {
      if (!dragId) return;
      e.preventDefault();
      col.root.classList.add("is-drag-over");
      if (settings.sortBy === "manual") {
        const hovered = e.target.closest(".kanban-card");
        clearDragIndicators();
        if (hovered && hovered.dataset.id !== dragId) {
          const rect = hovered.getBoundingClientRect();
          const before = e.clientY - rect.top < rect.height / 2;
          hovered.classList.add(before ? "drag-over-top" : "drag-over-bottom");
        }
      }
    });
    col.list.addEventListener("dragleave", (e) => {
      if (!col.root.contains(e.relatedTarget)) col.root.classList.remove("is-drag-over");
    });
    col.list.addEventListener("drop", (e) => {
      e.preventDefault();
      col.root.classList.remove("is-drag-over");
      clearDragIndicators();
      if (!dragId) return;
      let targetId = null;
      let before = true;
      const hovered = e.target.closest(".kanban-card");
      if (hovered && hovered.dataset.id !== dragId && settings.sortBy === "manual") {
        targetId = hovered.dataset.id;
        const rect = hovered.getBoundingClientRect();
        before = e.clientY - rect.top < rect.height / 2;
      }
      moveCard(dragId, status, targetId, before);
      dragId = null;
    });
  });

  function moveCard(sourceId, targetStatus, targetId, before) {
    const source = findTodo(sourceId);
    if (!source) return;
    setStatus(source, targetStatus);
    const sourceIdx = todos.findIndex((t) => t.id === sourceId);
    todos.splice(sourceIdx, 1);
    if (targetId) {
      let targetIdx = todos.findIndex((t) => t.id === targetId);
      if (targetIdx === -1) targetIdx = todos.length;
      todos.splice(before ? targetIdx : targetIdx + 1, 0, source);
    } else {
      todos.push(source);
    }
    saveTodos(todos);
    render();
  }

  /* ---------------------------------------------------------
     Core mutations
     --------------------------------------------------------- */
  function toggleFavorite(id) {
    const todo = findTodo(id);
    if (!todo) return;
    todo.favorite = !todo.favorite;
    touch(todo);
    saveTodos(todos);
  }

  function deleteWithUndo(id) {
    const index = todos.findIndex((t) => t.id === id);
    if (index === -1) return;
    const [removed] = todos.splice(index, 1);
    saveTodos(todos);
    render();
    showToast("Task deleted", "Undo", () => {
      todos.splice(index, 0, removed);
      saveTodos(todos);
      render();
    });
  }

  function clearDone() {
    const removed = todos.filter((t) => t.status === "done");
    if (removed.length === 0) return;
    todos = todos.filter((t) => t.status !== "done");
    saveTodos(todos);
    render();
    showToast(`Cleared ${removed.length} done task${removed.length === 1 ? "" : "s"}`, "Undo", () => {
      todos = [...removed, ...todos];
      saveTodos(todos);
      render();
    });
  }

  /* ---------------------------------------------------------
     Add-task forms — the header bar (always To do) and each
     column's own quick composer (creates straight into that column).
     --------------------------------------------------------- */
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = addInput.value.trim();
    if (!text) return;

    const tags = addTags.value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const todo = normalizeTodo({
      text,
      status: "todo",
      priority: pendingPriority,
      dueDate: addDue.value || null,
      tags,
    });
    todos.unshift(todo);
    saveTodos(todos);
    render();

    addInput.value = "";
    addDue.value = "";
    addTags.value = "";
    pendingPriority = "none";
    setActiveButton(addOptions.querySelector('[data-pending="priority"]'), pendingPriority);
    addOptions.hidden = true;
    addOptionsToggle.setAttribute("aria-expanded", "false");
    addInput.focus();
  });

  STATUSES.forEach((status) => {
    const col = columns[status];
    col.composerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = col.composerInput.value.trim();
      if (!text) return;
      const todo = normalizeTodo({ text, status });
      todos.unshift(todo);
      saveTodos(todos);
      render();
      col.composerInput.value = "";
      col.composerInput.focus();
    });
  });

  clearDoneBtn.addEventListener("click", clearDone);

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    render();
  });

  document.addEventListener("keydown", (e) => {
    if (!listView.hidden && e.key === "/" && document.activeElement !== searchInput && document.activeElement !== addInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------------------------------------------------
     Detail view
     --------------------------------------------------------- */
  function renderDetail() {
    const todo = currentTodo();
    if (!todo) { goTo("#/"); return; }

    document.title = `${todo.text} — OwnDo`;

    const ordered = [...todos].sort((a, b) => a.createdAt - b.createdAt);
    const position = ordered.findIndex((t) => t.id === todo.id) + 1;
    entryNumber.textContent = `No. ${String(position).padStart(3, "0")}`;

    detailPageLeft.classList.toggle("is-done", todo.status === "done");

    if (document.activeElement !== detailTitle) detailTitle.value = todo.text;
    detailFavorite.classList.toggle("is-active", todo.favorite);
    detailFavorite.setAttribute("aria-label", todo.favorite ? "Remove from favorites" : "Add to favorites");

    setActiveButton(statusRow, todo.status);
    setActiveButton(priorityRow, todo.priority);
    detailDue.value = todo.dueDate || "";
    detailRepeat.value = todo.repeat;
    if (document.activeElement !== detailNotes) detailNotes.value = todo.notes;

    renderTagChips(todo);
    renderSubtaskList(todo);
    renderCommentList(todo);
    refreshTagSuggestions();

    detailMeta.innerHTML = `Created ${formatDateTime(todo.createdAt)}<br>Updated ${formatDateTime(todo.updatedAt)}`;
  }

  function renderTagChips(todo) {
    detailTags.innerHTML = todo.tags
      .map(
        (tag) => `<span class="chip">${escapeHtml(tag)}<button type="button" data-tag="${escapeHtml(tag)}" aria-label="Remove tag ${escapeHtml(tag)}">
          <svg width="10" height="10" viewBox="0 0 20 20" aria-hidden="true"><line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </button></span>`
      )
      .join("");
    detailTags.querySelectorAll("[data-tag]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const todo2 = currentTodo();
        if (!todo2) return;
        todo2.tags = todo2.tags.filter((t) => t !== btn.getAttribute("data-tag"));
        touch(todo2);
        saveTodos(todos);
        renderDetail();
      });
    });
  }

  function refreshTagSuggestions() {
    const allTags = [...new Set(todos.flatMap((t) => t.tags))].sort((a, b) => a.localeCompare(b));
    tagSuggestions.innerHTML = allTags.map((t) => `<option value="${escapeHtml(t)}"></option>`).join("");
  }

  function renderSubtaskList(todo) {
    if (todo.subtasks.length === 0) {
      subtaskList.innerHTML = "";
      return;
    }
    subtaskList.innerHTML = todo.subtasks
      .map(
        (s) => `
      <li class="subtask-item${s.completed ? " is-done" : ""}" data-id="${s.id}">
        <button class="check-btn" type="button" aria-label="${s.completed ? "Mark as not done" : "Mark as done"}">
          <svg width="10" height="8" viewBox="0 0 12 10" aria-hidden="true"><path d="M1 5l3.5 3.5L11 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <span class="subtask-text">${escapeHtml(s.text)}</span>
        <button class="delete-btn" type="button" aria-label="Delete subtask">
          <svg width="13" height="13" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-7 0 1 11h6l1-11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </li>`
      )
      .join("");

    subtaskList.querySelectorAll(".subtask-item").forEach((li) => {
      const id = li.dataset.id;
      li.querySelector(".check-btn").addEventListener("click", () => {
        const todo2 = currentTodo();
        const s = todo2 && todo2.subtasks.find((x) => x.id === id);
        if (!s) return;
        s.completed = !s.completed;
        touch(todo2);
        saveTodos(todos);
        renderDetail();
      });
      li.querySelector(".delete-btn").addEventListener("click", () => {
        const todo2 = currentTodo();
        if (!todo2) return;
        todo2.subtasks = todo2.subtasks.filter((x) => x.id !== id);
        touch(todo2);
        saveTodos(todos);
        renderDetail();
      });
    });
  }

  function renderCommentList(todo) {
    if (todo.comments.length === 0) {
      commentList.innerHTML = "";
      return;
    }
    const sorted = [...todo.comments].sort((a, b) => a.createdAt - b.createdAt);
    commentList.innerHTML = sorted
      .map(
        (c) => `
      <li class="comment-item" data-id="${c.id}">
        <p class="comment-text">${escapeHtml(c.text)}</p>
        <div class="comment-footer">
          <span class="comment-time">${formatDateTime(c.createdAt)}</span>
          <button class="comment-delete" type="button">Delete</button>
        </div>
      </li>`
      )
      .join("");

    commentList.querySelectorAll(".comment-item").forEach((li) => {
      const id = li.dataset.id;
      li.querySelector(".comment-delete").addEventListener("click", () => {
        const todo2 = currentTodo();
        if (!todo2) return;
        todo2.comments = todo2.comments.filter((c) => c.id !== id);
        touch(todo2);
        saveTodos(todos);
        renderDetail();
      });
    });
  }

  detailTitle.addEventListener("blur", () => {
    const todo = currentTodo();
    if (!todo) return;
    const val = detailTitle.value.trim();
    if (val) {
      todo.text = val;
      touch(todo);
      saveTodos(todos);
    }
    renderDetail();
  });
  detailTitle.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); detailTitle.blur(); }
  });

  detailFavorite.addEventListener("click", () => {
    const todo = currentTodo();
    if (!todo) return;
    toggleFavorite(todo.id);
    renderDetail();
  });

  detailDelete.addEventListener("click", () => {
    const todo = currentTodo();
    if (!todo) return;
    const index = todos.findIndex((t) => t.id === todo.id);
    todos = todos.filter((t) => t.id !== todo.id);
    saveTodos(todos);
    goTo("#/");
    showToast("Task deleted", "Undo", () => {
      todos.splice(index, 0, todo);
      saveTodos(todos);
      render();
    });
  });

  statusRow.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const todo = currentTodo();
      if (!todo) return;
      setStatus(todo, btn.getAttribute("data-value"));
      saveTodos(todos);
      renderDetail();
    });
  });

  priorityRow.querySelectorAll(".option-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const todo = currentTodo();
      if (!todo) return;
      todo.priority = btn.getAttribute("data-value");
      touch(todo);
      saveTodos(todos);
      renderDetail();
    });
  });

  detailDue.addEventListener("change", () => {
    const todo = currentTodo();
    if (!todo) return;
    todo.dueDate = detailDue.value || null;
    touch(todo);
    saveTodos(todos);
    renderDetail();
  });

  detailRepeat.addEventListener("change", () => {
    const todo = currentTodo();
    if (!todo) return;
    todo.repeat = detailRepeat.value;
    touch(todo);
    saveTodos(todos);
  });

  detailNotes.addEventListener("blur", () => {
    const todo = currentTodo();
    if (!todo) return;
    todo.notes = detailNotes.value;
    touch(todo);
    saveTodos(todos);
    renderDetail();
  });

  tagForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const todo = currentTodo();
    if (!todo) return;
    const val = tagInput.value.trim();
    if (!val) return;
    if (!todo.tags.some((t) => t.toLowerCase() === val.toLowerCase())) {
      todo.tags.push(val);
      touch(todo);
      saveTodos(todos);
    }
    tagInput.value = "";
    renderTagChips(todo);
    refreshTagSuggestions();
  });

  subtaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const todo = currentTodo();
    if (!todo) return;
    const val = subtaskInput.value.trim();
    if (!val) return;
    todo.subtasks.push({ id: uid(), text: val, completed: false });
    touch(todo);
    saveTodos(todos);
    subtaskInput.value = "";
    renderSubtaskList(todo);
  });

  commentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const todo = currentTodo();
    if (!todo) return;
    const val = commentInput.value.trim();
    if (!val) return;
    todo.comments.push({ id: uid(), text: val, createdAt: Date.now() });
    touch(todo);
    saveTodos(todos);
    commentInput.value = "";
    renderCommentList(todo);
    logScroll.scrollTo({ top: logScroll.scrollHeight, behavior: "smooth" });
  });
  commentInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commentForm.requestSubmit();
    }
  });

  /* ---------------------------------------------------------
     Export / import
     --------------------------------------------------------- */
  exportBtn.addEventListener("click", () => {
    const payload = { app: "OwnDo", exportedAt: new Date().toISOString(), todos };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `owndo-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Tasks exported");
  });

  importBtn.addEventListener("click", () => importFile.click());

  importFile.addEventListener("change", () => {
    const file = importFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const incoming = Array.isArray(data) ? data : data.todos;
        if (!Array.isArray(incoming)) throw new Error("Invalid file");
        const existingIds = new Set(todos.map((t) => t.id));
        const cleaned = incoming.map(normalizeTodo).filter(Boolean).filter((t) => !existingIds.has(t.id));
        todos = [...cleaned, ...todos];
        saveTodos(todos);
        render();
        showToast(`Imported ${cleaned.length} task${cleaned.length === 1 ? "" : "s"}`);
      } catch {
        showToast("Couldn't read that file");
      }
      importFile.value = "";
    };
    reader.readAsText(file);
  });

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */
  applySettings();
  renderRoute();
})();
