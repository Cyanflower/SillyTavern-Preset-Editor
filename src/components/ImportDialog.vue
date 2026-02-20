<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-backdrop" @click.self="$emit('cancel')">
      <div class="import-dialog">
        <!-- Header -->
        <div class="dialog-header">
          <h3>📥 导入 Markdown</h3>
          <button class="dialog-close" @click="$emit('cancel')">✕</button>
        </div>

        <!-- Step 1: File upload -->
        <div v-if="!mergeReady" class="dialog-body">
          <div class="upload-zone" @click="pickFile">
            <div class="upload-icon">📄</div>
            <p>点击选择 Markdown 文件</p>
            <p class="upload-hint">将与当前编辑器中的条目进行对比</p>
          </div>
        </div>

        <!-- Step 2: Merge preview -->
        <div v-else class="dialog-body">
          <ChangePreview
            :items="mergeItems"
            @update:items="mergeItems = $event"
          />
        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>
          <button
            v-if="mergeReady"
            class="btn btn-accent"
            @click="applyChanges"
          >
            ✅ 应用变更
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { ParsedEntry } from '../types/preset';
import { parseMdWithMarkers } from '../core/md-parser';
import { buildMergeList, applyMergeList, type MergeItem } from '../core/diff-entries';
import ChangePreview from './ChangePreview.vue';

const props = defineProps<{
  visible: boolean;
  currentEntries: ParsedEntry[];
}>();

const emit = defineEmits<{
  'cancel': [];
  'apply': [entries: ParsedEntry[]];
}>();

const mergeReady = ref(false);
const mergeItems = ref<MergeItem[]>([]);

// Reset state when dialog opens
watch(() => props.visible, (val) => {
  if (val) {
    mergeReady.value = false;
    mergeItems.value = [];
  }
});

function pickFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.md';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const incomingEntries = parseMdWithMarkers(reader.result as string);
        mergeItems.value = buildMergeList(props.currentEntries, incomingEntries);
        mergeReady.value = true;
      } catch (e) {
        alert('MD 解析失败: ' + (e as Error).message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function applyChanges() {
  const result = applyMergeList(mergeItems.value);
  emit('apply', result);
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

.import-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  width: min(750px, 92vw);
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

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.dialog-close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem;
}

.dialog-close:hover {
  color: var(--color-text);
}

.dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.2rem;
  min-height: 0;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem 1.2rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

/* Upload zone */
.upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  border: 2px dashed var(--color-border);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.upload-zone:hover {
  border-color: var(--color-accent);
  background: rgba(99, 102, 241, 0.05);
}

.upload-icon {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  opacity: 0.5;
}

.upload-zone p {
  margin: 0.2rem 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.upload-hint {
  font-size: 0.75rem !important;
  opacity: 0.6;
}
</style>
