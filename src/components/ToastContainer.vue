<template>
  <div class="toast-container">
    <transition-group name="toast" tag="div" class="toast-stack">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast-${toast.type}`"
      >
        <div class="toast-content">
          <span class="toast-message">{{ toast.message }}</span>
          <button
            v-if="toast.action"
            class="toast-action-btn"
            @click="handleAction(toast)"
          >
            {{ toast.action.label }}
          </button>
        </div>
        <button
          class="toast-close-btn"
          @click="dismiss(toast.id)"
          title="Close"
        >
          <X :size="18" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { X } from '@lucide/vue';
import { useToast } from '../composables/useToast';

const { toasts, dismiss } = useToast();

const handleAction = async (toast: any) => {
  if (toast.action?.callback) {
    await toast.action.callback();
    dismiss(toast.id);
  }
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  pointer-events: none;
}

.toast-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toast {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 4px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease-out;
  pointer-events: auto;
  min-width: 300px;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.toast-message {
  line-height: 1.4;
}

.toast-success {
  background-color: rgba(81, 207, 102, 0.95);
  color: #fff;
}

.toast-error {
  background-color: rgba(255, 107, 107, 0.95);
  color: #fff;
}

.toast-info {
  background-color: rgba(66, 165, 245, 0.95);
  color: #fff;
}

.toast-action-btn {
  padding: 0.4rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.5);
  color: #fff;
  border-radius: 3px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background-color 0.15s;
  white-space: nowrap;
  flex-shrink: 0;
}

.toast-action-btn:hover {
  background-color: rgba(255, 255, 255, 0.3);
}

.toast-close-btn {
  padding: 0.4rem;
  background: none;
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.toast-close-btn:hover {
  opacity: 0.8;
}

@keyframes slideIn {
  from {
    transform: translateY(-20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease-out;
}

.toast-enter-from {
  transform: translateY(-20px);
  opacity: 0;
}

.toast-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

.toast-move {
  transition: all 0.3s ease-out;
}

@media (max-width: 600px) {
  .toast-container {
    left: 10px;
    right: 10px;
    transform: none;
  }

  .toast {
    min-width: unset;
    width: 100%;
  }
}
</style>
