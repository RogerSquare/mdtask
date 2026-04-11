import chalk from "chalk";
import type { Task, TaskStatus, TaskPriority } from "./task.js";

/**
 * Return a unicode icon for each task status.
 */
export function statusIcon(status: TaskStatus): string {
  switch (status) {
    case "todo":
      return "\u25CB"; // white circle
    case "in_progress":
      return "\u25B6"; // right-pointing triangle
    case "review":
      return "\u25C9"; // fisheye (eye-like)
    case "done":
      return "\u2714"; // check mark
    default:
      return "\u25CB";
  }
}

/**
 * Colorize a status string.
 */
function colorStatus(status: TaskStatus): string {
  const icon = statusIcon(status);
  const label = status.replace("_", " ");
  switch (status) {
    case "todo":
      return chalk.gray(`${icon} ${label}`);
    case "in_progress":
      return chalk.yellow(`${icon} ${label}`);
    case "review":
      return chalk.cyan(`${icon} ${label}`);
    case "done":
      return chalk.green(`${icon} ${label}`);
    default:
      return `${icon} ${label}`;
  }
}

/**
 * Colorize a priority string.
 */
function colorPriority(priority: TaskPriority): string {
  switch (priority) {
    case "high":
      return chalk.red(priority);
    case "medium":
      return chalk.yellow(priority);
    case "low":
      return chalk.dim(priority);
    default:
      return priority;
  }
}

/**
 * Truncate a string to a maximum length, appending "..." if truncated.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

/**
 * Pad a string to a fixed width (right-padded with spaces).
 */
function pad(str: string, width: number): string {
  // Strip ANSI codes to get the visible length
  const visible = str.replace(/\x1b\[[0-9;]*m/g, "");
  const padding = Math.max(0, width - visible.length);
  return str + " ".repeat(padding);
}

/**
 * Render a formatted table of tasks.
 */
export function formatTaskList(tasks: Task[]): string {
  if (tasks.length === 0) {
    return chalk.dim("  No tasks found.");
  }

  const termWidth = process.stdout.columns || 80;
  const idWidth = 24;
  const statusWidth = 16;
  const priorityWidth = 10;
  const titleWidth = Math.max(20, termWidth - idWidth - statusWidth - priorityWidth - 8);

  const lines: string[] = [];

  // Header
  lines.push(
    chalk.bold(
      `${pad("ID", idWidth)}  ${pad("STATUS", statusWidth)}  ${pad("PRI", priorityWidth)}  TITLE`
    )
  );
  lines.push(chalk.dim("-".repeat(Math.min(termWidth, 100))));

  for (const task of tasks) {
    const id = pad(truncate(task.id, idWidth), idWidth);
    const status = pad(colorStatus(task.status), statusWidth + 10); // extra for ANSI codes
    const priority = pad(colorPriority(task.priority), priorityWidth + 10);
    const title = truncate(task.title, titleWidth);
    lines.push(`${id}  ${status}  ${priority}  ${title}`);
  }

  return lines.join("\n");
}

/**
 * Render a 4-column mini kanban board.
 */
export function formatBoard(tasks: Task[]): string {
  const columns: Record<TaskStatus, Task[]> = {
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  };

  for (const task of tasks) {
    if (columns[task.status]) {
      columns[task.status].push(task);
    }
  }

  const termWidth = process.stdout.columns || 80;
  const colWidth = Math.max(16, Math.floor((termWidth - 5) / 4));
  const innerWidth = colWidth - 2;

  const headers: Record<TaskStatus, string> = {
    todo: "TODO",
    in_progress: "IN PROGRESS",
    review: "REVIEW",
    done: "DONE",
  };

  const headerColors: Record<TaskStatus, (s: string) => string> = {
    todo: chalk.gray.bold,
    in_progress: chalk.yellow.bold,
    review: chalk.cyan.bold,
    done: chalk.green.bold,
  };

  const statuses: TaskStatus[] = ["todo", "in_progress", "review", "done"];
  const maxRows = Math.max(1, ...statuses.map((s) => columns[s].length));

  const lines: string[] = [];

  // Top border
  const topBorder = statuses
    .map(() => "\u250C" + "\u2500".repeat(innerWidth) + "\u2510")
    .join(" ");
  lines.push(topBorder);

  // Headers
  const headerLine = statuses
    .map((s) => {
      const label = headers[s];
      const padded = label.length <= innerWidth
        ? label + " ".repeat(innerWidth - label.length)
        : label.slice(0, innerWidth);
      return "\u2502" + headerColors[s](padded) + "\u2502";
    })
    .join(" ");
  lines.push(headerLine);

  // Separator
  const sepLine = statuses
    .map(() => "\u251C" + "\u2500".repeat(innerWidth) + "\u2524")
    .join(" ");
  lines.push(sepLine);

  // Task rows
  for (let i = 0; i < maxRows; i++) {
    const row = statuses
      .map((s) => {
        const task = columns[s][i];
        if (!task) {
          return "\u2502" + " ".repeat(innerWidth) + "\u2502";
        }
        const entry = truncate(task.id, innerWidth);
        const padded = entry + " ".repeat(Math.max(0, innerWidth - entry.length));
        return "\u2502" + padded + "\u2502";
      })
      .join(" ");
    lines.push(row);

    // Show truncated title below the ID
    const titleRow = statuses
      .map((s) => {
        const task = columns[s][i];
        if (!task) {
          return "\u2502" + " ".repeat(innerWidth) + "\u2502";
        }
        const entry = truncate(task.title, innerWidth);
        const padded = chalk.dim(entry) + " ".repeat(Math.max(0, innerWidth - entry.length));
        return "\u2502" + padded + "\u2502";
      })
      .join(" ");
    lines.push(titleRow);

    // Blank spacer row between tasks (except after last)
    if (i < maxRows - 1) {
      const spacer = statuses
        .map(() => "\u2502" + " ".repeat(innerWidth) + "\u2502")
        .join(" ");
      lines.push(spacer);
    }
  }

  // Bottom border
  const bottomBorder = statuses
    .map(() => "\u2514" + "\u2500".repeat(innerWidth) + "\u2518")
    .join(" ");
  lines.push(bottomBorder);

  return lines.join("\n");
}

/**
 * Render full details for a single task.
 */
export function formatTaskDetail(task: Task): string {
  const lines: string[] = [];

  lines.push(chalk.bold.underline(task.title));
  lines.push("");
  lines.push(`${chalk.dim("ID:")}         ${task.id}`);
  lines.push(`${chalk.dim("Status:")}     ${colorStatus(task.status)}`);
  lines.push(`${chalk.dim("Priority:")}   ${colorPriority(task.priority)}`);
  lines.push(`${chalk.dim("Type:")}       ${task.type}`);
  lines.push(`${chalk.dim("Tags:")}       ${task.tags.length > 0 ? task.tags.join(", ") : chalk.dim("none")}`);
  lines.push("");
  lines.push(`${chalk.dim("Created:")}    ${task.created_at}`);
  if (task.started_at) {
    lines.push(`${chalk.dim("Started:")}    ${task.started_at}`);
  }
  if (task.reviewed_at) {
    lines.push(`${chalk.dim("Reviewed:")}   ${task.reviewed_at}`);
  }
  if (task.done_at) {
    lines.push(`${chalk.dim("Completed:")}  ${task.done_at}`);
  }

  if (task.content) {
    lines.push("");
    lines.push(chalk.dim("--- Content ---"));
    lines.push(task.content);
  }

  return lines.join("\n");
}
