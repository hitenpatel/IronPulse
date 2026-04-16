/**
 * Drop-in replacement for expo-task-manager.
 *
 * No-op stubs. Background tasks require native module support; this wrapper
 * silently does nothing until a real implementation is linked.
 */

export interface TaskManagerTask {
  data: any;
  error: any;
}

type TaskExecutor = (body: TaskManagerTask) => Promise<void> | void;

const _registeredTasks = new Map<string, TaskExecutor>();

export function defineTask(taskName: string, executor: TaskExecutor): void {
  _registeredTasks.set(taskName, executor);
}

export async function isTaskRegisteredAsync(
  taskName: string,
): Promise<boolean> {
  return _registeredTasks.has(taskName);
}

export async function unregisterAllTasksAsync(): Promise<void> {
  _registeredTasks.clear();
}

export async function unregisterTaskAsync(taskName: string): Promise<void> {
  _registeredTasks.delete(taskName);
}
