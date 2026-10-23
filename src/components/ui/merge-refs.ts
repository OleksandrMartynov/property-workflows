import type { Ref } from "react";

/** Склеює зовнішній `ref` компонента з його внутрішнім (React 19: ref — звичайний проп). */
export function mergeRefs<T>(...refs: Array<Ref<T> | undefined>): (node: T | null) => void {
  return (node) => {
    for (const ref of refs) {
      if (typeof ref === "function") ref(node);
      else if (ref) (ref as { current: T | null }).current = node;
    }
  };
}
