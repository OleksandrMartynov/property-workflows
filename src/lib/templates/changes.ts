// Що змінилось у незбережених змінах шаблону порівняно з поточною версією (лише для адміністратора в редакторі):
// позначки «New» / «Edited» біля задач і секцій і підсумок «Changes since Version N». Задачу версії з задачею чернетки
// зв'язує template_task_id; секцію версії (у знімку — лише назва й позиція) — через її задачі, а без задач — за назвою.
import type { VersionTask } from "./current";

export interface DraftSection {
  id: string;
  name: string;
}
export interface DraftTask {
  id: string;
  section_id: string;
  name: string;
  required: boolean;
}

export type ItemChange = "new" | "edited";

export interface DraftChanges {
  sections: Map<string, ItemChange>;
  tasks: Map<string, ItemChange>;
  summary: {
    sectionsAdded: number;
    sectionsRenamed: number;
    sectionsRemoved: number;
    tasksAdded: number;
    tasksEdited: number;
    tasksRemoved: number;
  };
}

/** Порівняння чернетки з поточною версією; `version` — null, якщо шаблон ще не збережено (тоді позначок немає). */
export function draftChanges(sections: readonly DraftSection[], tasks: readonly DraftTask[], version: readonly VersionTask[] | null): DraftChanges {
  const result: DraftChanges = {
    sections: new Map(),
    tasks: new Map(),
    summary: { sectionsAdded: 0, sectionsRenamed: 0, sectionsRemoved: 0, tasksAdded: 0, tasksEdited: 0, tasksRemoved: 0 },
  };
  if (!version) return result;

  const versionTask = new Map(version.map((v) => [v.template_task_id, v]));
  const versionSections = new Map<number, string>();
  for (const v of version) versionSections.set(v.section_position, v.section_name);

  // Секція чернетки → секція версії: за більшістю її задач, що були у версії; інакше — вільна секція з тією самою назвою.
  const matched = new Map<string, number>();
  const taken = new Set<number>();
  for (const s of sections) {
    const votes = new Map<number, number>();
    for (const t of tasks) {
      const v = t.section_id === s.id ? versionTask.get(t.id) : undefined;
      if (v) votes.set(v.section_position, (votes.get(v.section_position) ?? 0) + 1);
    }
    const best = [...votes.entries()].filter(([pos]) => !taken.has(pos)).sort((a, b) => b[1] - a[1])[0];
    if (best) {
      matched.set(s.id, best[0]);
      taken.add(best[0]);
    }
  }
  for (const s of sections) {
    if (matched.has(s.id)) continue;
    const byName = [...versionSections.entries()].find(([pos, name]) => !taken.has(pos) && name === s.name);
    if (byName) {
      matched.set(s.id, byName[0]);
      taken.add(byName[0]);
    }
  }

  for (const s of sections) {
    const pos = matched.get(s.id);
    if (pos === undefined) {
      result.sections.set(s.id, "new");
      result.summary.sectionsAdded++;
    } else if (versionSections.get(pos) !== s.name) {
      result.sections.set(s.id, "edited");
      result.summary.sectionsRenamed++;
    }
  }
  result.summary.sectionsRemoved = [...versionSections.keys()].filter((pos) => !taken.has(pos)).length;

  const draftIds = new Set(tasks.map((t) => t.id));
  for (const t of tasks) {
    const v = versionTask.get(t.id);
    if (!v) {
      result.tasks.set(t.id, "new");
      result.summary.tasksAdded++;
    } else if (v.name !== t.name || v.required !== t.required || matched.get(t.section_id) !== v.section_position) {
      result.tasks.set(t.id, "edited");
      result.summary.tasksEdited++;
    }
  }
  result.summary.tasksRemoved = version.filter((v) => !draftIds.has(v.template_task_id)).length;
  return result;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Рядки підсумку змін для панелі «Details»: лише ненульові, у порядку «додано → змінено → видалено». */
export function changeLines(summary: DraftChanges["summary"]): string[] {
  const lines: string[] = [];
  if (summary.sectionsAdded) lines.push(`${plural(summary.sectionsAdded, "section", "sections")} added`);
  if (summary.tasksAdded) lines.push(`${plural(summary.tasksAdded, "task", "tasks")} added`);
  if (summary.sectionsRenamed) lines.push(`${plural(summary.sectionsRenamed, "section", "sections")} renamed`);
  if (summary.tasksEdited) lines.push(`${plural(summary.tasksEdited, "task", "tasks")} edited`);
  if (summary.sectionsRemoved) lines.push(`${plural(summary.sectionsRemoved, "section", "sections")} removed`);
  if (summary.tasksRemoved) lines.push(`${plural(summary.tasksRemoved, "task", "tasks")} removed`);
  return lines;
}
