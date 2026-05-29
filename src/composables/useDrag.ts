import { type Ref, ref } from 'vue';

type DragState = {
  dragOffset: Ref<number>;
  isDragging: Ref<boolean>;
  handleTouchStart: (e: TouchEvent) => void;
  handleTouchMove: (e: TouchEvent) => void;
  handleTouchEnd: (e: TouchEvent) => void;
};

export function useDrag(onDismiss: () => void, threshold: number = 50): DragState {
  const dragOffset = ref(0);
  const isDragging = ref(false);
  let startX = 0;

  const handleTouchStart = (e: TouchEvent): void => {
    startX = e.touches[0].clientX;
    isDragging.value = true;
  };

  const handleTouchMove = (e: TouchEvent): void => {
    if (!isDragging.value) return;
    const currentX = e.touches[0].clientX;
    const offset = currentX - startX;

    if (offset > 0) {
      dragOffset.value = offset;
    }
  };

  const handleTouchEnd = (_e: TouchEvent): void => {
    isDragging.value = false;

    if (dragOffset.value > threshold) {
      onDismiss();
    } else {
      dragOffset.value = 0;
    }
  };

  return {
    dragOffset,
    isDragging,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
