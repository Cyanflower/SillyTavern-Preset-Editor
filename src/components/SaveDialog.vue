<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-backdrop" @click.self="cancel">
      <div class="dialog" @keydown.enter="confirm" @keydown.escape="cancel">
        <h3 class="dialog-title">{{ title }}</h3>

        <input
          ref="inputEl"
          class="dialog-input"
          :value="modelValue"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
          spellcheck="false"
        />

        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="cancel">取消</button>
          <button class="btn btn-accent" @click="confirm">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

const props = defineProps<{
  visible: boolean;
  modelValue: string;
  title?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'confirm': [filename: string];
  'cancel': [];
}>();

const inputEl = ref<HTMLInputElement>();

// Auto-focus + select name (without extension) when dialog opens
watch(() => props.visible, async (val) => {
  if (!val) return;
  await nextTick();
  inputEl.value?.focus();
  // Select just the filename stem, not the extension
  const name = props.modelValue;
  const dotIdx = name.lastIndexOf('.');
  inputEl.value?.setSelectionRange(0, dotIdx > 0 ? dotIdx : name.length);
});

function confirm() {
  emit('confirm', props.modelValue);
}

function cancel() {
  emit('cancel');
}
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fade-in 0.12s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 1.5rem;
  width: min(420px, 90vw);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slide-up 0.15s ease;
}

@keyframes slide-up {
  from { transform: translateY(12px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dialog-title {
  margin: 0 0 1rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.dialog-input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: monospace;
  padding: 0.55rem 0.75rem;
  margin-bottom: 1rem;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.dialog-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
