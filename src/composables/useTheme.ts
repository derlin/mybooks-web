import { onMounted, ref } from 'vue';
import { Storage } from '../utils/storage';

type Theme = 'light' | 'dark' | 'auto';

export function useTheme() {
  const storage = new Storage({ silentFail: true });
  const theme = ref<Theme>('auto');

  const applyTheme = (newTheme: Theme) => {
    const html = document.documentElement;

    if (newTheme === 'auto') {
      html.removeAttribute('data-theme');
      storage.clear('color-scheme');
    } else {
      html.setAttribute('data-theme', newTheme);
      storage.save('color-scheme', newTheme);
    }

    theme.value = newTheme;
  };

  const loadTheme = () => {
    const saved = storage.load('color-scheme') as Theme | null;
    const loadedTheme = saved || 'auto';
    theme.value = loadedTheme;

    if (loadedTheme !== 'auto') {
      document.documentElement.setAttribute('data-theme', loadedTheme);
    }
  };

  onMounted(() => {
    loadTheme();
  });

  return {
    theme,
    applyTheme,
  };
}
