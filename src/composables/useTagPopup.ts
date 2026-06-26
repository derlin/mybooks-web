import { ref } from 'vue';
import type { Book } from '@/types';

export type TagPopupAction = {
  type: 'filter' | 'rename' | 'delete';
  oldTag: string;
  newTag?: string;
};

export type TagPopupOptions = {
  tag: string;
  allBooks: Book[];
  onAction: (action: TagPopupAction) => void;
};

const activePopups = ref<TagPopupOptions[]>([]);

export function useTagPopup() {
  const openPopup = (options: TagPopupOptions) => {
    activePopups.value.push(options);
  };

  const closePopup = (index: number) => {
    activePopups.value.splice(index, 1);
  };

  const handleAction = (index: number, action: TagPopupAction) => {
    const popup = activePopups.value[index];
    if (popup) {
      popup.onAction(action);
      closePopup(index);
    }
  };

  return {
    activePopups,
    openPopup,
    closePopup,
    handleAction,
  };
}
