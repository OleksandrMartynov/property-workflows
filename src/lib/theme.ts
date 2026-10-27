// Вибір теми «System / Light / Dark» (AC-DSYS-05…06). Живе на пристрої (localStorage), не в профілі: працює й на
// сторінці входу. Чиста логіка без React — її читають і вбудований скрипт у <head>, і перемикач у інтерфейсі.

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_KEY = "pw.theme";
/** Подія в межах вкладки: інші частини інтерфейсу (шейдер входу) перечитують токени після зміни. */
export const THEME_EVENT = "pw-theme";
export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"];

export const THEME_LABELS: Record<ThemeChoice, string> = { system: "System", light: "Light", dark: "Dark" };

/** Невідоме чи зіпсоване значення — «System» (за замовчуванням тема слідує за пристроєм). */
export const parseTheme = (raw: unknown): ThemeChoice => (raw === "light" || raw === "dark" ? raw : "system");

/** Яку тему видно: «System» слідує за виглядом пристрою, «Light» і «Dark» — незалежно від нього. */
export const resolveTheme = (choice: ThemeChoice, deviceIsDark: boolean): ResolvedTheme =>
  choice === "system" ? (deviceIsDark ? "dark" : "light") : choice;

type ReadableStorage = Pick<Storage, "getItem">;
type WritableStorage = Pick<Storage, "setItem">;

/** Читання вибору: storage може бути недоступним (приватне вікно, заборонені дані сайту) — тоді «System». */
export function readStoredTheme(storage: ReadableStorage | undefined): ThemeChoice {
  try {
    return parseTheme(storage?.getItem(THEME_KEY));
  } catch {
    return "system";
  }
}

/** Запис вибору; повертає false, якщо storage недоступний (вибір тоді діє лише до перезавантаження). */
export function writeStoredTheme(storage: WritableStorage | undefined, choice: ThemeChoice): boolean {
  try {
    if (!storage) return false;
    storage.setItem(THEME_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

/** Атрибут `data-theme` на <html>: для «System» його немає (тоді діє `prefers-color-scheme`). */
export const themeAttribute = (choice: ThemeChoice): ResolvedTheme | null => (choice === "system" ? null : choice);

export function applyTheme(root: Pick<HTMLElement, "setAttribute" | "removeAttribute">, choice: ThemeChoice) {
  const attribute = themeAttribute(choice);
  if (attribute) root.setAttribute("data-theme", attribute);
  else root.removeAttribute("data-theme");
}

/**
 * Вбудований скрипт у <head> (layout.tsx): ставить `data-theme` до першого малювання, щоб не було спалаху чужої теми.
 * Мінімум коду, без імпортів; будь-яка помилка storage — мовчки «System».
 */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;
