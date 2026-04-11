#!/usr/bin/env node

import { Command } from "commander";
import path from "node:path";
import chalk from "chalk";
import {
  initTaskDir,
  createTask,
  loadTask,
  loadAllTasks,
  updateTask,
  findTaskDir,
  setTasksDir,
} from "./task.js";
import type { TaskPriority, TaskStatus, TaskType } from "./task.js";
import {
  formatTaskList,
  formatBoard,
  formatTaskDetail,
} from "./display.js";

const program = new Command();

program
  .name("mdtask")
  .version("1.0.0")
  .description(
    "Terminal task manager using Markdown files with YAML frontmatter"
  )
  .option("-d, --dir <path>", "Use a custom tasks directory instead of .tasks/");

// Apply --dir before any command runs
program.hook("preAction", () => {
  const opts = program.opts();
  if (opts.dir) {
    const dir = path.resolve(opts.dir);
    setTasksDir(dir);
  }
});

// --- init ---
program
  .command("init")
  .description("Create a .tasks/ directory in the current project")
  .action(() => {
    const dir = initTaskDir();
    console.log(chalk.green(`Initialized task directory at ${dir}`));
  });

// --- add ---
program
  .command("add <title>")
  .description("Create a new task")
  .option(
    "-p, --priority <level>",
    "Priority: high, medium, low",
    "medium"
  )
  .option("-t, --tags <tags>", "Comma-separated tags")
  .option(
    "--type <type>",
    "Type: frontend, backend, fullstack, devops",
    "fullstack"
  )
  .action(
    (
      title: string,
      opts: { priority: string; tags?: string; type: string }
    ) => {
      try {
        const tags = opts.tags
          ? opts.tags.split(",").map((t) => t.trim())
          : [];
        const task = createTask(title, {
          priority: opts.priority as TaskPriority,
          tags,
          type: opts.type as TaskType,
        });
        console.log(chalk.green(`Created task: ${task.id}`));
        console.log(chalk.dim(`  Title:    ${task.title}`));
        console.log(chalk.dim(`  Priority: ${task.priority}`));
        console.log(chalk.dim(`  Type:     ${task.type}`));
        if (task.tags.length > 0) {
          console.log(chalk.dim(`  Tags:     ${task.tags.join(", ")}`));
        }
      } catch (err) {
        console.error(
          chalk.red((err as Error).message)
        );
        process.exit(1);
      }
    }
  );

// --- list ---
program
  .command("list")
  .description("List all tasks")
  .option(
    "-s, --status <status>",
    "Filter by status: todo, in_progress, review, done"
  )
  .option("-p, --priority <level>", "Filter by priority: high, medium, low")
  .option("-a, --all", "Include done tasks (hidden by default)")
  .action(
    (opts: { status?: string; priority?: string; all?: boolean }) => {
      try {
        let tasks = loadAllTasks();

        if (opts.status) {
          tasks = tasks.filter((t) => t.status === opts.status);
        } else if (!opts.all) {
          // Hide done tasks unless --all is passed
          tasks = tasks.filter((t) => t.status !== "done");
        }

        if (opts.priority) {
          tasks = tasks.filter((t) => t.priority === opts.priority);
        }

        // Sort: high > medium > low, then by created_at
        const priorityOrder: Record<string, number> = {
          high: 0,
          medium: 1,
          low: 2,
        };
        tasks.sort(
          (a, b) =>
            (priorityOrder[a.priority] ?? 1) -
              (priorityOrder[b.priority] ?? 1) ||
            a.created_at.localeCompare(b.created_at)
        );

        console.log(formatTaskList(tasks));
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    }
  );

// --- view ---
program
  .command("view <id>")
  .description("Show full task details")
  .action((id: string) => {
    try {
      const task = loadTask(id);
      console.log(formatTaskDetail(task));
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });

// --- start ---
program
  .command("start <id>")
  .description("Move task to in_progress")
  .action((id: string) => {
    try {
      const task = updateTask(id, { status: "in_progress" });
      console.log(
        chalk.yellow(`Started task: ${task.id} - ${task.title}`)
      );
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });

// --- review ---
program
  .command("review <id>")
  .description("Move task to review")
  .action((id: string) => {
    try {
      const task = updateTask(id, { status: "review" });
      console.log(
        chalk.cyan(`Task moved to review: ${task.id} - ${task.title}`)
      );
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });

// --- done ---
program
  .command("done <id>")
  .description("Move task to done")
  .action((id: string) => {
    try {
      const task = updateTask(id, { status: "done" });
      console.log(
        chalk.green(`Task completed: ${task.id} - ${task.title}`)
      );
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });

// --- board ---
program
  .command("board")
  .description("Show a mini kanban board in the terminal")
  .action(() => {
    try {
      const tasks = loadAllTasks();
      console.log(formatBoard(tasks));
    } catch (err) {
      console.error(chalk.red((err as Error).message));
      process.exit(1);
    }
  });

// --- edit ---
program
  .command("edit <id>")
  .description("Update task fields")
  .option("--title <title>", "Update the title")
  .option(
    "-p, --priority <level>",
    "Update priority: high, medium, low"
  )
  .option(
    "-s, --status <status>",
    "Update status: todo, in_progress, review, done"
  )
  .option("-t, --tags <tags>", "Update tags (comma-separated)")
  .option(
    "--type <type>",
    "Update type: frontend, backend, fullstack, devops"
  )
  .action(
    (
      id: string,
      opts: {
        title?: string;
        priority?: string;
        status?: string;
        tags?: string;
        type?: string;
      }
    ) => {
      try {
        const updates: Record<string, unknown> = {};

        if (opts.title !== undefined) updates.title = opts.title;
        if (opts.priority !== undefined) updates.priority = opts.priority;
        if (opts.status !== undefined) updates.status = opts.status;
        if (opts.type !== undefined) updates.type = opts.type;
        if (opts.tags !== undefined) {
          updates.tags = opts.tags.split(",").map((t) => t.trim());
        }

        if (Object.keys(updates).length === 0) {
          console.log(
            chalk.yellow(
              "No updates provided. Use --title, --priority, --status, --tags, or --type."
            )
          );
          return;
        }

        const task = updateTask(id, updates);
        console.log(chalk.green(`Updated task: ${task.id}`));
        console.log(formatTaskDetail(task));
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    }
  );

program.parse();
