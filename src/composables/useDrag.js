import { ref } from 'vue';

export function useDrag(onDismiss, threshold = 50) {
  const dragOffset = ref(0);
  const isDragging = ref(false);
  let startX = 0;

  const handleTouchStart = (e) => {
    startX = e.touches[0].clientX;
    isDragging.value = true;
  };

  const handleTouchMove = (e) => {
    if (!isDragging.value) return;
    const currentX = e.touches[0].clientX;
    const offset = currentX - startX;

    if (offset > 0) {
      dragOffset.value = offset;
    }
  };

  const handleTouchEnd = (e) => {
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
