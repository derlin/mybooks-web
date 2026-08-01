import { onMounted, onUnmounted, watch } from 'vue';
import { Storage } from '../utils/storage';

type DraftNotes = {
  hash: string;
  notes: string;
};

const NOTES_AUTO_SAVE_KEY = 'mybooks_editform_draft';
const AUTO_SAVE_DEBOUNCE_MS = 300;

/**
 * Debounced localStorage auto-save for a single notes field, so an in-progress
 * edit survives an accidental reload. The `hash` identifies which book the
 * draft belongs to: a draft is only restored when it matches the current hash.
 *
 * @param getHash  current book identity (e.g. its key, or 'new' when adding)
 * @param getNotes reactive getter for the notes text to persist
 * @param setNotes writes restored notes back into the form
 */
export function useNotesDraft(getHash: () => string, getNotes: () => string, setNotes: (notes: string) => void) {
  const storage = new Storage({ silentFail: true });
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const save = () => {
    const draft: DraftNotes = { hash: getHash(), notes: getNotes() };
    storage.saveJson(NOTES_AUTO_SAVE_KEY, draft);
  };

  const restore = () => {
    const draft = storage.loadJson<DraftNotes>(NOTES_AUTO_SAVE_KEY);
    if (draft && draft.hash === getHash()) {
      setNotes(draft.notes);
    }
  };

  const clearDraft = () => {
    storage.clear(NOTES_AUTO_SAVE_KEY);
  };

  watch(getNotes, () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(save, AUTO_SAVE_DEBOUNCE_MS);
  });

  onMounted(restore);

  onUnmounted(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  return { clearDraft };
}
