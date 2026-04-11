import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "review" | "done";
  priority: "high" | "medium" | "low";
  type: "frontend" | "backend" | "fullstack" | "devops";
  tags: string[];
  created_at: string;
  started_at: string | null;
  reviewed_at: string | null;
  done_at: string | null;
  updated_at: string | null;
  content: string;
}

export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
export type TaskType = Task["type"];

const TASKS_DIR_NAME = ".tasks";

// Override for testing -- when set, bypasses the directory walk.
let overrideTasksDir: string | null = null;

/**
 * Set an explicit tasks directory path. Primarily used for testing.
 * Pass null to revert to the default directory-walk behavior.
 */
export function setTasksDir(dir: string | null): void {
  overrideTasksDir = dir;
}

/**
 * Walk up from the current working directory looking for a .tasks/ directory,
 * similar to how git finds .git/. Returns the path to the .tasks/ directory
 * or null if not found.
 */
export function findTaskDir(startDir?: string): string | null {
  if (overrideTasksDir) return overrideTasksDir;

  let dir = startDir ?? process.cwd();
  const root = path.parse(dir).root;

  while (true) {
    const candidate = path.join(dir, TASKS_DIR_NAME);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir || dir === root) {
      return null;
    }
    dir = parent;
  }
}

/**
 * Returns the tasks directory, throwing if it cannot be found.
 */
export function getTaskDir(): string {
  if (overrideTasksDir) return overrideTasksDir;

  const dir = findTaskDir();
  if (!dir) {
    throw new Error(
      "No .tasks/ directory found. Run `mdtask init` to create one."
    );
  }
  return dir;
}

/**
 * Create the .tasks/ directory in the current working directory.
 * When an override is set (via setTasksDir), creates that directory instead.
 */
export function initTaskDir(): string {
  const dir = overrideTasksDir ?? path.join(process.cwd(), TASKS_DIR_NAME);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Generate a slug-style ID from a title, with a 3-digit counter to avoid
 * collisions.
 */
export function generateId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  const dir = getTaskDir();
  const existing = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith(".md"))
    : [];

  let counter = 1;
  while (true) {
    const id = `${slug}-${String(counter).padStart(3, "0")}`;
    const taken = existing.some(
      (f) => f === `${id}.md` || f.startsWith(`${id}.`)
    );
    if (!taken) return id;
    counter++;
  }
}

export interface CreateTaskOptions {
  priority?: TaskPriority;
  tags?: string[];
  type?: TaskType;
}

/**
 * Create a new task .md file with YAML frontmatter and return the parsed task.
 */
export function createTask(title: string, opts: CreateTaskOptions = {}): Task {
  const dir = getTaskDir();
  const id = generateId(title);
  const now = new Date().toISOString();

  const task: Task = {
    id,
    title,
    status: "todo",
    priority: opts.priority ?? "medium",
    type: opts.type ?? "fullstack",
    tags: opts.tags ?? [],
    created_at: now,
    started_at: null,
    reviewed_at: null,
    done_at: null,
    updated_at: null,
    content: "",
  };

  const frontmatter: Record<string, unknown> = {
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    type: task.type,
    tags: task.tags,
    created_at: task.created_at,
    started_at: task.started_at,
    reviewed_at: task.reviewed_at,
    done_at: task.done_at,
    updated_at: task.updated_at,
  };

  const content = matter.stringify("", frontmatter);
  const filePath = path.join(dir, `${id}.md`);
  fs.writeFileSync(filePath, content, "utf-8");

  return task;
}

/**
 * Load and parse a single task by ID.
 */
export function loadTask(id: string): Task {
  const dir = getTaskDir();
  const filePath = path.join(dir, `${id}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Task not found: ${id}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;

  return {
    id: (data.id as string) ?? id,
    title: (data.title as string) ?? "",
    status: (data.status as TaskStatus) ?? "todo",
    priority: (data.priority as TaskPriority) ?? "medium",
    type: (data.type as TaskType) ?? "fullstack",
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    created_at: (data.created_at as string) ?? "",
    started_at: (data.started_at as string | null) ?? null,
    reviewed_at: (data.reviewed_at as string | null) ?? null,
    done_at: (data.done_at as string | null) ?? null,
    updated_at: (data.updated_at as string | null) ?? null,
    content: parsed.content.trim(),
  };
}

/**
 * Load all tasks from the .tasks/ directory.
 */
export function loadAllTasks(): Task[] {
  const dir = getTaskDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const tasks: Task[] = [];

  for (const file of files) {
    const id = file.replace(/\.md$/, "");
    try {
      tasks.push(loadTask(id));
    } catch {
      // Skip malformed files
    }
  }

  return tasks;
}

/**
 * Update a task's frontmatter fields and rewrite the file. Automatically
 * sets timestamp fields when status transitions occur.
 */
export function updateTask(
  id: string,
  updates: Partial<Omit<Task, "id" | "created_at">>
): Task {
  const dir = getTaskDir();
  const filePath = path.join(dir, `${id}.md`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Task not found: ${id}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const data = parsed.data as Record<string, unknown>;
  const now = new Date().toISOString();

  // Set updated_at on every update
  data.updated_at = now;

  // Apply updates to frontmatter
  if (updates.title !== undefined) data.title = updates.title;
  if (updates.priority !== undefined) data.priority = updates.priority;
  if (updates.type !== undefined) data.type = updates.type;
  if (updates.tags !== undefined) data.tags = updates.tags;

  // Handle status transitions with automatic timestamps
  if (updates.status !== undefined && updates.status !== data.status) {
    data.status = updates.status;
    switch (updates.status) {
      case "in_progress":
        data.started_at = now;
        break;
      case "review":
        data.reviewed_at = now;
        break;
      case "done":
        data.done_at = now;
        break;
    }
  }

  // Handle content updates
  const body =
    updates.content !== undefined ? updates.content : parsed.content;

  const output = matter.stringify(body, data);
  fs.writeFileSync(filePath, output, "utf-8");

  return loadTask(id);
}
