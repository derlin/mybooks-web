import { type MaybeRefOrGetter, onUnmounted, toValue, watch } from 'vue';

/**
 * Escape-to-dismiss for overlays (drawer, modals, popups).
 *
 * Handlers are kept in a stack so that only the topmost overlay reacts: with the
 * Goodreads modal open on top of the edit form, Escape closes the modal alone.
 * Position in the stack follows the order in which overlays became active, so a
 * nested overlay always wins over the one it opened from.
 */
const stack: Array<() => void> = [];

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key !== 'Escape' || stack.length === 0) return;
  e.preventDefault();
  stack[stack.length - 1]();
};

const push = (handler: () => void) => {
  if (stack.length === 0) window.addEventListener('keydown', handleKeyDown);
  stack.push(handler);
};

const remove = (handler: () => void) => {
  const index = stack.lastIndexOf(handler);
  if (index === -1) return;
  stack.splice(index, 1);
  if (stack.length === 0) window.removeEventListener('keydown', handleKeyDown);
};

/**
 * @param onEscape called when Escape is pressed and this overlay is the topmost active one
 * @param isActive whether the overlay is currently visible; omit for components that are
 *   mounted only while open (`v-if` on the parent side)
 */
export function useEscapeKey(onEscape: () => void, isActive: MaybeRefOrGetter<boolean> = true) {
  // Stable identity so the same reference can be pushed and removed from the stack.
  const handler = () => onEscape();

  watch(
    () => toValue(isActive),
    (active) => {
      if (active) {
        push(handler);
      } else {
        remove(handler);
      }
    },
    { immediate: true }
  );

  onUnmounted(() => remove(handler));
}
