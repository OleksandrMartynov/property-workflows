// Дія completeTask передає в базу p_confirmed лише для форми з confirmed=yes (AC-TASK-04, AC-TASK-16).
// Supabase, redirect і revalidatePath — заглушки: перевіряємо лише, з якими аргументами дія викликає complete_task.
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase/viewer", () => ({
  requireViewer: async () => ({ supabase: { rpc }, viewer: { id: "b", role: "manager", email: "manager.b@example.test" } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { completeTask } = await import("@/app/runs/actions");

const RUN = "11111111-1111-1111-1111-111111111111";
const TASK = "22222222-2222-2222-2222-222222222222";
const form = (confirmed?: string) => {
  const fd = new FormData();
  fd.set("run_id", RUN);
  fd.set("task_id", TASK);
  if (confirmed !== undefined) fd.set("confirmed", confirmed);
  return fd;
};

describe("Дія completeTask", () => {
  beforeEach(() => rpc.mockReset());

  it("AC-TASK-04: підтверджена форма (confirmed=yes) — complete_task з p_confirmed: true", async () => {
    rpc.mockResolvedValue({ error: null });
    await expect(completeTask(form("yes"))).rejects.toThrow(`NEXT_REDIRECT /runs/${RUN}`);
    expect(rpc).toHaveBeenCalledWith("complete_task", { p_task_id: TASK, p_confirmed: true });
  });

  it("AC-TASK-16: форма без підтвердження — без p_confirmed; відмова бази — повідомлення, задача лишається «to do»", async () => {
    rpc.mockResolvedValue({ error: { message: "CONFIRMATION_REQUIRED" } });
    await expect(completeTask(form())).rejects.toThrow(`NEXT_REDIRECT /runs/${RUN}?error=CONFIRMATION_REQUIRED`);
    expect(rpc).toHaveBeenCalledWith("complete_task", { p_task_id: TASK });
  });
});
