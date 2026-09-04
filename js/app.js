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
  };

  /* ---------------------------------------------------------
     Storage helpers — everything lives in localStorage only.
     --------------------------------------------------------- */
  function loadTodos() {
    try {
      const raw = localStorage.getItem(STORAGE_TODOS);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveTodos(todos) {
    localStorage.setItem(STORAGE_TODOS, JSON.stringify(todos));
  }

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_SETTINGS);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  function saveSettings(settings) {
    localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings));
  }

  function uid() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /* ---------------------------------------------------------
     State
     --------------------------------------------------------- */
  let todos = loadTodos();
  let settings = loadSettings();
  let filter = "all";
  let query = "";
  let dragId = null;

  /* ---------------------------------------------------------
     DOM refs
     --------------------------------------------------------- */
  const root = document.documentElement;
  const addForm = document.getElementById("addForm");
  const addInput = document.getElementById("addInput");
  const todoList = document.getElementById("todoList");
  const emptyState = document.getElementById("emptyState");
  const countLabel = document.getElementById("countLabel");
  const clearCompletedBtn = document.getElementById("clearCompletedBtn");
  const searchInput = document.getElementById("searchInput");
  const filterButtons = document.querySelectorAll(".filter-btn");

  const settingsBtn = document.getElementById("settingsBtn");
  const closeSettings = document.getElementById("closeSettings");
  const settingsPanel = document.getElementById("settingsPanel");
  const overlay = document.getElementById("overlay");

  const exportBtn = document.getElementById("exportBtn");
  const importBtn = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  const toast = document.getElementById("toast");

  /* ---------------------------------------------------------
     Settings application
     --------------------------------------------------------- */
  function applySettings() {
    root.setAttribute("data-theme", settings.theme);
    root.setAttribute("data-accent", settings.accent);
    root.setAttribute("data-density", settings.density);
    root.setAttribute("data-corners", settings.corners);
    root.setAttribute("data-font", settings.font);

    document.querySelectorAll("[data-setting]").forEach((group) => {
      const key = group.getAttribute("data-setting");
      group.querySelectorAll("[data-value]").forEach((btn) => {
        btn.classList.toggle("is-active", btn.getAttribute("data-value") === settings[key]);
      });
    });
  }

  function updateSetting(key, value) {
    settings[key] = value;
    saveSettings(settings);
    applySettings();
  }

  document.querySelectorAll("[data-setting]").forEach((group) => {
    const key = group.getAttribute("data-setting");
    group.querySelectorAll("[data-value]").forEach((btn) => {
      btn.addEventListener("click", () => updateSetting(key, btn.getAttribute("data-value")));
    });
  });

  /* ---------------------------------------------------------
     Settings panel open/close
     --------------------------------------------------------- */
  function openSettings() {
    settingsPanel.hidden = false;
    overlay.hidden = false;
    settingsBtn.setAttribute("aria-expanded", "true");
    closeSettings.focus();
  }

  function closeSettingsPanel() {
    settingsPanel.hidden = true;
    overlay.hidden = true;
    settingsBtn.setAttribute("aria-expanded", "false");
    settingsBtn.focus();
  }

  settingsBtn.addEventListener("click", openSettings);
  closeSettings.addEventListener("click", closeSettingsPanel);
  overlay.addEventListener("click", closeSettingsPanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !settingsPanel.hidden) closeSettingsPanel();
  });

  /* ---------------------------------------------------------
     Rendering
     --------------------------------------------------------- */
  function matchesFilter(todo) {
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;
    if (query && !todo.text.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  }

  function render() {
    const visible = todos.filter(matchesFilter);
    todoList.innerHTML = "";

    visible.forEach((todo) => {
      todoList.appendChild(renderItem(todo));
    });

    const total = todos.length;
    const done = todos.filter((t) => t.completed).length;
    countLabel.textContent = total === 0
      ? "0 tasks"
      : `${total} task${total === 1 ? "" : "s"}, ${done} completed`;

    clearCompletedBtn.disabled = done === 0;

    const noneAtAll = total === 0;
    const noneVisible = visible.length === 0 && !noneAtAll;
    emptyState.hidden = !noneAtAll;
    todoList.hidden = noneAtAll;

    if (noneVisible) {
      todoList.hidden = false;
      todoList.innerHTML = `<li class="empty-state"><p class="empty-sub">No tasks match${query ? ` “${escapeHtml(query)}”` : " this filter"}.</p></li>`;
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderItem(todo) {
    const li = document.createElement("li");
    li.className = "todo-item" + (todo.completed ? " is-done" : "");
    li.dataset.id = todo.id;
    li.draggable = true;

    li.innerHTML = `
      <button class="drag-handle" aria-label="Drag to reorder" type="button">
        <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true">
          <circle cx="3" cy="3" r="1.4" fill="currentColor"/><circle cx="9" cy="3" r="1.4" fill="currentColor"/>
          <circle cx="3" cy="8" r="1.4" fill="currentColor"/><circle cx="9" cy="8" r="1.4" fill="currentColor"/>
          <circle cx="3" cy="13" r="1.4" fill="currentColor"/><circle cx="9" cy="13" r="1.4" fill="currentColor"/>
        </svg>
      </button>
      <button class="check-btn" type="button" aria-label="${todo.completed ? "Mark as not done" : "Mark as done"}">
        <svg width="12" height="10" viewBox="0 0 12 10" aria-hidden="true"><path d="M1 5l3.5 3.5L11 1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <span class="todo-text" tabindex="0" role="button" aria-label="Edit task">${escapeHtml(todo.text)}</span>
      <input class="edit-input" type="text" maxlength="200" hidden />
      <div class="item-actions">
        <button class="edit-btn" type="button" aria-label="Edit task">
          <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M13.5 2.5l4 4L7 17H3v-4L13.5 2.5Z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>
        </button>
        <button class="delete-btn" type="button" aria-label="Delete task">
          <svg width="15" height="15" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 6h12M8 6V4h4v2m-7 0 1 11h6l1-11" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    `;

    li.querySelector(".check-btn").addEventListener("click", () => toggleTodo(todo.id));
    li.querySelector(".delete-btn").addEventListener("click", () => deleteTodo(todo.id));
    li.querySelector(".edit-btn").addEventListener("click", () => startEdit(li, todo));
    li.querySelector(".todo-text").addEventListener("click", () => startEdit(li, todo));
    li.querySelector(".todo-text").addEventListener("keydown", (e) => {
      if (e.key === "Enter") startEdit(li, todo);
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
    li.addEventListener("dragover", (e) => {
      e.preventDefault();
      const rect = li.getBoundingClientRect();
      const before = e.clientY - rect.top < rect.height / 2;
      clearDragIndicators();
      li.classList.add(before ? "drag-over-top" : "drag-over-bottom");
    });
    li.addEventListener("dragleave", () => {
      li.classList.remove("drag-over-top", "drag-over-bottom");
    });
    li.addEventListener("drop", (e) => {
      e.preventDefault();
      const rect = li.getBoundingClientRect();
      const before = e.clientY - rect.top < rect.height / 2;
      reorder(dragId, todo.id, before);
      clearDragIndicators();
    });

    return li;
  }

  function clearDragIndicators() {
    document.querySelectorAll(".drag-over-top, .drag-over-bottom").forEach((el) => {
      el.classList.remove("drag-over-top", "drag-over-bottom");
    });
  }

  function reorder(sourceId, targetId, before) {
    if (!sourceId || sourceId === targetId) return;
    const sourceIdx = todos.findIndex((t) => t.id === sourceId);
    if (sourceIdx === -1) return;
    const [item] = todos.splice(sourceIdx, 1);
    let targetIdx = todos.findIndex((t) => t.id === targetId);
    if (targetIdx === -1) targetIdx = todos.length;
    todos.splice(before ? targetIdx : targetIdx + 1, 0, item);
    persistAndRender();
  }

  /* ---------------------------------------------------------
     Editing
     --------------------------------------------------------- */
  function startEdit(li, todo) {
    const textEl = li.querySelector(".todo-text");
    const input = li.querySelector(".edit-input");
    textEl.hidden = true;
    input.hidden = false;
    input.value = todo.text;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    const commit = () => {
      const val = input.value.trim();
      if (val) {
        updateTodo(todo.id, val);
      } else {
        render();
      }
    };
    const cancel = () => render();

    input.addEventListener("blur", commit, { once: true });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        input.removeEventListener("blur", commit);
        cancel();
      }
    });
  }

  /* ---------------------------------------------------------
     Mutations
     --------------------------------------------------------- */
  function persistAndRender() {
    saveTodos(todos);
    render();
  }

  function addTodo(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    todos.unshift({ id: uid(), text: trimmed, completed: false, createdAt: Date.now() });
    persistAndRender();
  }

  function toggleTodo(id) {
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.completed = !todo.completed;
    persistAndRender();
  }

  function updateTodo(id, text) {
    const todo = todos.find((t) => t.id === id);
    if (todo) todo.text = text;
    persistAndRender();
  }

  function deleteTodo(id) {
    todos = todos.filter((t) => t.id !== id);
    persistAndRender();
  }

  function clearCompleted() {
    todos = todos.filter((t) => !t.completed);
    persistAndRender();
  }

  /* ---------------------------------------------------------
     Events
     --------------------------------------------------------- */
  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addTodo(addInput.value);
    addInput.value = "";
    addInput.focus();
  });

  clearCompletedBtn.addEventListener("click", clearCompleted);

  searchInput.addEventListener("input", () => {
    query = searchInput.value;
    render();
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filter = btn.getAttribute("data-filter");
      filterButtons.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      render();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput && document.activeElement !== addInput) {
      e.preventDefault();
      searchInput.focus();
    }
  });

  /* ---------------------------------------------------------
     Export / import
     --------------------------------------------------------- */
  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 2400);
  }

  exportBtn.addEventListener("click", () => {
    const payload = {
      app: "OwnDo",
      exportedAt: new Date().toISOString(),
      todos,
    };
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
        const cleaned = incoming
          .filter((t) => t && typeof t.text === "string")
          .map((t) => ({
            id: typeof t.id === "string" ? t.id : uid(),
            text: t.text,
            completed: Boolean(t.completed),
            createdAt: typeof t.createdAt === "number" ? t.createdAt : Date.now(),
          }));
        const existingIds = new Set(todos.map((t) => t.id));
        const merged = cleaned.filter((t) => !existingIds.has(t.id));
        todos = [...merged, ...todos];
        persistAndRender();
        showToast(`Imported ${merged.length} task${merged.length === 1 ? "" : "s"}`);
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
  render();
})();
