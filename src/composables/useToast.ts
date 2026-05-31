import { inject, provide, ref } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    callback: () => void | Promise<void>;
  };
}

interface ToastInternal extends Toast {
  timeoutId?: NodeJS.Timeout;
}

const TOAST_KEY = Symbol('toast');

// Default durations per type (ms)
const DURATIONS = {
  success: 3000,
  error: 5000,
  info: 4000,
};

export function createToastProvider() {
  const toasts = ref<ToastInternal[]>([]);

  const show = (
    type: ToastType,
    message: string,
    options?: {
      action?: Toast['action'];
      duration?: number;
    }
  ): string => {
    const id = crypto.randomUUID();
    const duration = options?.duration ?? DURATIONS[type];

    const toast: ToastInternal = {
      id,
      type,
      message,
      action: options?.action,
    };

    if (duration > 0) {
      toast.timeoutId = setTimeout(() => {
        dismiss(id);
      }, duration);
    }

    toasts.value.push(toast);
    return id;
  };

  const dismiss = (id: string) => {
    const idx = toasts.value.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const toast = toasts.value[idx];
      if (toast.timeoutId) {
        clearTimeout(toast.timeoutId);
      }
      toasts.value.splice(idx, 1);
    }
  };

  const showSuccess = (message: string, action?: Toast['action'], duration?: number) =>
    show('success', message, { action, duration });

  const showError = (message: string, action?: Toast['action'], duration?: number) =>
    show('error', message, { action, duration });

  const showInfo = (message: string, action?: Toast['action'], duration?: number) =>
    show('info', message, { action, duration });

  const api = {
    toasts,
    show,
    dismiss,
    showSuccess,
    showError,
    showInfo,
  };

  provide(TOAST_KEY, api);
  return api;
}

export function useToast() {
  const api = inject<ReturnType<typeof createToastProvider>>(TOAST_KEY);
  if (!api) {
    throw new Error('useToast must be called within a component wrapped by ToastProvider');
  }
  return api;
}
