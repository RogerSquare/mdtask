import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  initTaskDir,
  createTask,
  loadTask,
  loadAllTasks,
  updateTask,
  generateId,
  setTasksDir,
} from '../task.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdtask-test-'));
  setTasksDir(path.join(tmpDir, '.tasks'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('initTaskDir', () => {
  it('creates .tasks directory', () => {
    const tasksPath = path.join(tmpDir, '.tasks');
    expect(fs.existsSync(tasksPath)).toBe(false);

    initTaskDir();

    expect(fs.existsSync(tasksPath)).toBe(true);
    expect(fs.statSync(tasksPath).isDirectory()).toBe(true);
  });
});

describe('createTask', () => {
  beforeEach(() => {
    initTaskDir();
  });

  it('creates a markdown file with frontmatter', () => {
    const task = createTask('My First Task');

    const tasksDir = path.join(tmpDir, '.tasks');
    const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.md'));
    expect(files.length).toBe(1);

    const content = fs.readFileSync(path.join(tasksDir, files[0]), 'utf-8');
    expect(content).toContain('---');
    expect(content).toContain('title: My First Task');
    expect(task.title).toBe('My First Task');
  });

  it('sets default status to todo', () => {
    const task = createTask('Default Status Task');

    expect(task.status).toBe('todo');
  });

  it('sets default priority to medium', () => {
    const task = createTask('Default Priority Task');

    expect(task.priority).toBe('medium');
  });

  it('respects priority option', () => {
    const task = createTask('High Priority Task', { priority: 'high' });

    expect(task.priority).toBe('high');
  });

  it('respects tags option', () => {
    const task = createTask('Tagged Task', { tags: ['bug', 'urgent'] });

    expect(task.tags).toEqual(['bug', 'urgent']);
  });
});

describe('loadTask', () => {
  beforeEach(() => {
    initTaskDir();
  });

  it('returns correct task data', () => {
    const created = createTask('Load Me', { priority: 'high', tags: ['test'] });

    const loaded = loadTask(created.id);

    expect(loaded).toBeDefined();
    expect(loaded!.id).toBe(created.id);
    expect(loaded!.title).toBe('Load Me');
    expect(loaded!.priority).toBe('high');
    expect(loaded!.status).toBe('todo');
    expect(loaded!.tags).toEqual(['test']);
  });
});

describe('loadAllTasks', () => {
  beforeEach(() => {
    initTaskDir();
  });

  it('returns all tasks', () => {
    createTask('Task One');
    createTask('Task Two');
    createTask('Task Three');

    const tasks = loadAllTasks();

    expect(tasks.length).toBe(3);
    const titles = tasks.map((t) => t.title).sort();
    expect(titles).toEqual(['Task One', 'Task Three', 'Task Two']);
  });
});

describe('updateTask', () => {
  beforeEach(() => {
    initTaskDir();
  });

  it('changes status and sets timestamp', () => {
    const task = createTask('Update Me');
    const before = Date.now();

    const updated = updateTask(task.id, { status: 'review' });

    expect(updated.status).toBe('review');
    expect(updated.updated_at).toBeDefined();
    expect(new Date(updated.updated_at!).getTime()).toBeGreaterThanOrEqual(before);
  });

  it('sets started_at when moving to in_progress', () => {
    const task = createTask('Start Me');

    const updated = updateTask(task.id, { status: 'in_progress' });

    expect(updated.status).toBe('in_progress');
    expect(updated.started_at).toBeDefined();
    expect(new Date(updated.started_at!).getTime()).toBeGreaterThan(0);
  });

  it('sets done_at when moving to done', () => {
    const task = createTask('Finish Me');

    const updated = updateTask(task.id, { status: 'done' });

    expect(updated.status).toBe('done');
    expect(updated.done_at).toBeDefined();
    expect(new Date(updated.done_at!).getTime()).toBeGreaterThan(0);
  });
});

describe('generateId', () => {
  it('creates slug from title', () => {
    const id = generateId('My Cool Feature');

    expect(id).toMatch(/^my-cool-feature/);
    expect(id).not.toContain(' ');
  });

  it('handles special characters', () => {
    const id = generateId('Fix bug: crash on @login! (v2)');

    expect(id).not.toMatch(/[^a-z0-9-]/);
    expect(id.length).toBeGreaterThan(0);
  });
});
