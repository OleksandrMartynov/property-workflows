"use client";

import { usePathname, useRouter } from "next/navigation";
import { EyeIcon, PencilIcon } from "@/components/ui/icons";
import { Segmented } from "@/components/ui/segmented";

/** «Edit / Preview» редактора: режим — у адресі (?view=preview), тож його можна відкрити посиланням і повернутися назад. */
export function ModeSwitch({ mode }: { mode: "edit" | "preview" }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <Segmented
      aria-label="Editor mode"
      size="sm"
      value={mode}
      onValueChange={(next) => router.replace(next === "preview" ? `${pathname}?view=preview` : pathname, { scroll: false })}
      options={[
        { value: "edit", label: "Edit", icon: <PencilIcon /> },
        { value: "preview", label: "Preview", icon: <EyeIcon /> },
      ]}
    />
  );
}
