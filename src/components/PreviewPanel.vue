<template>
  <div class="preview-panel">
    <div class="preview-header">
      <h3>{{ title }}</h3>
      <div class="preview-actions">
        <button
          v-if="content"
          class="btn btn-secondary"
          @click="copyToClipboard"
          :title="copied ? '已复制!' : '复制'"
        >
          {{ copied ? '✅ 已复制' : '📋 复制' }}
        </button>
        <button
          v-if="content"
          class="btn btn-primary"
          @click="openDialog"
        >
          💾 下载
        </button>
      </div>
    </div>
    <div class="preview-content">
      <pre v-if="content"><code>{{ content }}</code></pre>
      <div v-else class="preview-empty">
        {{ placeholder }}
      </div>
    </div>

    <SaveDialog
      :visible="dialogVisible"
      :title="'保存文件'"
      v-model="pendingFilename"
      @confirm="onConfirm"
      @cancel="dialogVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import SaveDialog from './SaveDialog.vue';

const props = defineProps<{
  title: string;
  content: string;
  placeholder: string;
  downloadFilename: string;
}>();

const copied = ref(false);
const dialogVisible = ref(false);
const pendingFilename = ref('');

function copyToClipboard() {
  navigator.clipboard.writeText(props.content);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}

function openDialog() {
  pendingFilename.value = props.downloadFilename;
  dialogVisible.value = true;
}

function onConfirm(filename: string) {
  dialogVisible.value = false;
  const blob = new Blob([props.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.preview-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.preview-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text);
}

.preview-actions {
  display: flex;
  gap: 0.5rem;
}

.preview-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--color-bg-deep);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.preview-content pre {
  margin: 0;
  padding: 1rem;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--color-text);
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}

.preview-empty {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}
</style>
