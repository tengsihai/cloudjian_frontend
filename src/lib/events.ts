export interface NewNoteRequest {
  dir?: string;
  shareId?: string;
}

const NEW_NOTE_EVENT = 'cloudjian:new-note';

export function requestNewNote(detail: NewNoteRequest = {}) {
  window.dispatchEvent(new CustomEvent<NewNoteRequest>(NEW_NOTE_EVENT, { detail }));
}

export function onNewNote(handler: (detail: NewNoteRequest) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<NewNoteRequest>).detail ?? {});
  };
  window.addEventListener(NEW_NOTE_EVENT, listener);
  return () => window.removeEventListener(NEW_NOTE_EVENT, listener);
}

let navGuard: (() => boolean) | null = null;

export function setNavGuard(guard: () => boolean) {
  navGuard = guard;
  return () => {
    if (navGuard === guard) navGuard = null;
  };
}

export function canNavigate() {
  return !navGuard || navGuard();
}
