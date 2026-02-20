<template>
  <div
    class="file-drop-zone"
    :class="{ 'drag-over': isDragOver, 'has-file': !!fileName }"
    @dragover.prevent="isDragOver = true"
    @dragleave="isDragOver = false"
    @drop.prevent="onDrop"
    @click="fileInput?.click()"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      style="display: none"
      @change="onFileSelect"
    />
    <div class="drop-content">
      <div class="drop-icon">{{ fileName ? '📄' : '📥' }}</div>
      <div class="drop-text" v-if="!fileName">
        {{ label }}<br />
        <span class="drop-hint">拖拽文件到此处或点击选择</span>
      </div>
      <div class="drop-text" v-else>
        {{ fileName }}
        <span class="drop-hint">点击重新选择</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  label: string;
  accept: string;
}>();

const emit = defineEmits<{
  (e: 'file-loaded', content: string, filename: string): void;
}>();

const isDragOver = ref(false);
const fileName = ref('');
const fileInput = ref<HTMLInputElement | null>(null);

function onDrop(event: DragEvent) {
  isDragOver.value = false;
  const file = event.dataTransfer?.files[0];
  if (file) readFile(file);
}

function onFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) readFile(file);
}

function readFile(file: File) {
  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    emit('file-loaded', reader.result as string, file.name);
  };
  reader.readAsText(file);
}
</script>

<style scoped>
.file-drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--color-surface);
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-drop-zone:hover,
.file-drop-zone.drag-over {
  border-color: var(--color-accent);
  background: var(--color-surface-hover);
}

.file-drop-zone.has-file {
  border-style: solid;
  border-color: var(--color-success);
}

.drop-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.drop-text {
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.6;
}

.drop-hint {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}
</style>
