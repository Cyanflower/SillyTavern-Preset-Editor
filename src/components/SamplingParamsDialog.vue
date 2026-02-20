<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-backdrop" @click.self="$emit('cancel')">
      <div class="dialog" @keydown.escape="$emit('cancel')">
        <h3 class="dialog-title">⚙️ 采样参数</h3>

        <div class="params-list">
          <div class="params-header">
            <span>参数</span>
            <span>当前值</span>
          </div>

          <div
            v-for="param in editableParams"
            :key="param.key"
            class="param-row"
          >
            <label class="param-label" :for="'param-' + param.key">
              {{ param.label }}
            </label>
            <input
              :id="'param-' + param.key"
              class="param-input"
              :type="isTextParam(param.key) ? 'text' : 'number'"
              :step="getStep(param.key)"
              v-model="localValues[param.key]"
            />
          </div>
        </div>

        <div class="dialog-actions">
          <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>
          <button class="btn btn-accent" @click="onSave">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SillyTavernPreset } from '../types/preset';
import { SAMPLING_KEYS } from '../core/json-import';

const props = defineProps<{
  visible: boolean;
  preset: SillyTavernPreset | null;
}>();

const emit = defineEmits<{
  cancel: [];
  save: [updated: SillyTavernPreset];
}>();

// Editable local copy
const localValues = ref<Record<string, string>>({});

// Params where input type should be text (not number)
const TEXT_PARAMS = new Set(['reasoning_effort']);

function isTextParam(key: string): boolean {
  return TEXT_PARAMS.has(key);
}

function getStep(key: string): string {
  if (key === 'temperature' || key === 'top_p' || key === 'top_a' || key === 'min_p') return '0.01';
  if (key === 'repetition_penalty') return '0.01';
  return '1';
}

const editableParams = SAMPLING_KEYS;

// Sync localValues from preset when dialog opens
watch(
  () => props.visible,
  (val) => {
    if (!val || !props.preset) return;
    const preset = props.preset as Record<string, unknown>;
    const values: Record<string, string> = {};
    for (const { key } of SAMPLING_KEYS) {
      const v = preset[key];
      values[key] = v !== undefined && v !== null ? String(v) : '';
    }
    localValues.value = values;
  },
);

function onSave() {
  if (!props.preset) return;

  const updated = { ...props.preset } as Record<string, unknown>;

  for (const { key } of SAMPLING_KEYS) {
    const raw = localValues.value[key];
    if (raw === '' || raw === undefined) continue;

    if (isTextParam(key)) {
      updated[key] = raw;
    } else {
      const num = Number(raw);
      if (!isNaN(num)) {
        updated[key] = num;
      }
    }
  }

  emit('save', updated as SillyTavernPreset);
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
  width: min(500px, 90vw);
  max-height: 85vh;
  display: flex;
  flex-direction: column;
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
  flex-shrink: 0;
}

.params-list {
  overflow-y: auto;
  flex: 1;
  margin-bottom: 1rem;
}

.params-header {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 0.25rem;
}

.param-row {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 0.5rem;
  align-items: center;
  padding: 0.35rem 0.5rem;
  border-radius: 6px;
  transition: background 0.1s;
}

.param-row:hover {
  background: var(--color-bg);
}

.param-label {
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}

.param-input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.85rem;
  font-family: monospace;
  padding: 0.3rem 0.5rem;
  box-sizing: border-box;
  text-align: right;
  transition: border-color 0.15s;
}

.param-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-shrink: 0;
}
</style>
