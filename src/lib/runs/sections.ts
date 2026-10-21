// AC-TASK-12, AC-RUN-12: задачі запуску групами за секціями запуску (копія секцій шаблону на момент запуску),
// у порядку секцій, а в секції — у порядку задач.

export interface SectionTask {
  section_name: string;
  section_position: number;
  position: number;
}

export interface SectionGroup<T> {
  name: string;
  tasks: T[];
}

export function groupBySection<T extends SectionTask>(tasks: readonly T[]): SectionGroup<T>[] {
  const sorted = [...tasks].sort((a, b) => a.section_position - b.section_position || a.position - b.position);
  const groups: SectionGroup<T>[] = [];
  for (const task of sorted) {
    const last = groups.at(-1);
    if (last && last.name === task.section_name) last.tasks.push(task);
    else groups.push({ name: task.section_name, tasks: [task] });
  }
  return groups;
}
