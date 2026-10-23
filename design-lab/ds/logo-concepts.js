/* Property Workflows — logo concepts (geometry only). 24-grid master + 20 + 16 hinted. All ink = currentColor. */
window.PW_LOGO = (() => {
  const st = (w = 2, extra = "") => `fill="none" stroke="currentColor" stroke-width="${w}" ${extra}`;
  const F = (s) => s.replace(/<(path|rect|circle)/g, '<$1 fill="currentColor"');
  const C = [
    { id: "echo-roof", name: "Echo Roof", tag: "Nested gables = steps",
      v24: `<path d="M3 22V12L12 3L21 12V22" ${st()}/><path d="M7 22V13.66L12 8.66L17 13.66V22" ${st()}/><path d="M10 22V14.9L12 12.9L14 14.9V22Z" fill="currentColor"/>`,
      v20: `<path d="M2 19V10L10 2L18 10V19" ${st()}/><path d="M6 19V11.66L10 7.66L14 11.66V19" ${st()}/><path d="M9 19V12.9L10 11.9L11 12.9V19Z" fill="currentColor"/>`,
      v16: `<path d="M2 15V8L8 2L14 8V15" ${st()}/><path d="M5 15V9L8 6L11 9V15Z" fill="currentColor"/>` },
    { id: "gable-p", name: "Gable P", tag: "Roofline = flow path",
      v24: `<path d="M6 21V9L12 3L18 9V15H6" ${st()}/><circle cx="6" cy="20" r="2.5" fill="currentColor"/>`,
      v16: `<path d="M4 12V6L8 2L12 6V10H4" ${st()}/><circle cx="4" cy="12.5" r="2" fill="currentColor"/>` },
    { id: "keyhouse", name: "Key Path", tag: "House-key with step teeth",
      v24: `<path d="M7 10V7L12 2L17 7V10Z" ${st(2)}/><path d="M12 10V22M12 15H17M12 20H15" ${st(2)}/>`,
      v16: `<path d="M4 7V5L8 1L12 5V7Z" ${st(2)}/><path d="M8 7V15M8 11H12M8 14H11" ${st(2)}/>` },
    { id: "strata", name: "Strata", tag: "Checklist steps = house",
      v24: F(`<path d="M12 2L21 11H3Z"/><rect x="4" y="13" width="16" height="4"/><rect x="4" y="19" width="16" height="3"/>`),
      v16: F(`<path d="M8 1L15 8H1Z"/><rect x="2" y="10" width="12" height="3"/><rect x="2" y="14" width="12" height="1"/>`) },
    { id: "open-door", name: "Open Door", tag: "Progress ring + doorway",
      v24: `<path d="M12 2.75A9.25 9.25 0 1 1 2.75 12" ${st(2, 'stroke-linecap="round"')}/><path d="M9 17.5V12a3 3 0 0 1 6 0V17.5Z" fill="currentColor"/>`,
      v16: `<path d="M8 2A6 6 0 1 1 2 8" ${st(2)}/><path d="M6 11V8a2 2 0 0 1 4 0V11Z" fill="currentColor"/>` },
  ];
  const svg = (c, size, kind = "auto") => {
    const g = kind !== "auto" ? kind : size <= 18 ? "16" : size <= 21 ? "20" : "24";
    const inner = c["v" + g] || c.v24; const vb = c["v" + g] ? +g : 24;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${vb} ${vb}" aria-hidden="true">${inner}</svg>`;
  };
  return { C, svg };
})();
