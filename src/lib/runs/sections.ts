// AC-TASK-12, AC-RUN-12: задачі запуску групами за секціями запуску (копія секцій шаблону на момент запуску),
// у порядку секцій, а в секції — у порядку задач.

export interface SectionTask {
  section_name: string;
  section_position: number;
  position: number;
}

export interface SectionGroup<T> {
  /** Унікальний ключ групи: позиція + назва (дві секції шаблону можуть мати однакову позицію). */
  key: string;
  name: string;
  tasks: T[];
}

export function groupBySection<T extends SectionTask>(tasks: readonly T[]): SectionGroup<T>[] {
  // Позиція секції не унікальна в шаблоні (default 0), тож назва секції — другий ключ сортування:
  // задачі однієї секції завжди йдуть підряд і не розпадаються на кілька груп.
  const sorted = [...tasks].sort(
    (a, b) =>
      a.section_position - b.section_position ||
      a.section_name.localeCompare(b.section_name) ||
      a.position - b.position,
  );
  const groups: SectionGroup<T>[] = [];
  for (const task of sorted) {
    const key = `${task.section_position}:${task.section_name}`;
    const last = groups.at(-1);
    if (last && last.key === key) last.tasks.push(task);
    else groups.push({ key, name: task.section_name, tasks: [task] });
  }
  return groups;
}
