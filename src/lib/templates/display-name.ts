/** Запасний текст лише для показу стертої назви (AC-EDITOR-20): у чернетці й у діях назва лишається порожньою. */
export const UNTITLED = { template: "Untitled template", section: "Untitled section", task: "Untitled task" } as const;

export const shownName = (name: string, kind: keyof typeof UNTITLED) => name.trim() || UNTITLED[kind];
