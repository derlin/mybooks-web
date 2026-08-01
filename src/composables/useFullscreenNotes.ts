import { nextTick, onMounted, onUnmounted, ref } from 'vue';

/**
 * Fullscreen toggle for the notes editor, plus the Cmd+Enter (Mac) /
 * Ctrl+Enter (Windows/Linux) shortcut that toggles it. On open, focus moves to
 * the fullscreen textarea — bind the returned `fullscreenNotesTextarea` to it.
 */
export function useFullscreenNotes() {
  const fullscreenNotesOpen = ref(false);
  const fullscreenNotesTextarea = ref<HTMLTextAreaElement | null>(null);

  const toggleFullscreenNotes = () => {
    fullscreenNotesOpen.value = !fullscreenNotesOpen.value;
    if (fullscreenNotesOpen.value) {
      nextTick(() => {
        fullscreenNotesTextarea.value?.focus();
      });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const isToggleKey = isMac ? e.metaKey && e.code === 'Enter' : e.ctrlKey && e.code === 'Enter';

    if (isToggleKey) {
      e.preventDefault();
      toggleFullscreenNotes();
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return { fullscreenNotesOpen, fullscreenNotesTextarea, toggleFullscreenNotes };
}
