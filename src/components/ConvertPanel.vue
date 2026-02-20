<template>
  <div class="panel">
    <h2>JSON → Markdown</h2>
    <p class="panel-desc">上传 SillyTavern 预设 JSON 文件，转换为可读的 Markdown 格式。</p>

    <FileDropZone
      label="选择 SillyTavern 预设 JSON 文件"
      accept=".json"
      @file-loaded="onJsonLoaded"
    />

    <div v-if="error" class="error-msg">⚠️ {{ error }}</div>

    <div v-if="stats" class="stats-bar">
      <span>📊 共 {{ stats.total }} 个条目</span>
      <span>✅ {{ stats.enabled }} 已启用</span>
      <span>⬜ {{ stats.disabled }} 已禁用</span>
      <span>📌 {{ stats.markers }} 个占位标记</span>
    </div>

    <PreviewPanel
      v-if="mdOutput"
      title="Markdown 输出"
      :content="mdOutput"
      placeholder="上传 JSON 文件后在此预览 Markdown 输出"
      :download-filename="downloadName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FileDropZone from './FileDropZone.vue';
import PreviewPanel from './PreviewPanel.vue';
import { jsonToMd } from '../core/json-to-md';
import { parseMdWithMarkers } from '../core/md-parser';
import type { SillyTavernPreset } from '../types/preset';

const mdOutput = ref('');
const error = ref('');
const sourceFilename = ref('');
const stats = ref<{ total: number; enabled: number; disabled: number; markers: number } | null>(null);

const downloadName = computed(() => {
  const base = sourceFilename.value.replace(/\.json$/i, '');
  return base ? `${base}.md` : 'preset.md';
});

function onJsonLoaded(content: string, filename: string) {
  error.value = '';
  mdOutput.value = '';
  stats.value = null;
  sourceFilename.value = filename;

  try {
    const preset: SillyTavernPreset = JSON.parse(content);

    if (!preset.prompts || !preset.prompt_order) {
      throw new Error('文件不是有效的 SillyTavern 预设 (缺少 prompts 或 prompt_order)');
    }

    const md = jsonToMd(preset, filename);
    mdOutput.value = md;

    // 统计
    const entries = parseMdWithMarkers(md);
    const markers = entries.filter(e => e.marker).length;
    const enabled = entries.filter(e => !e.marker && e.enabled).length;
    const disabled = entries.filter(e => !e.marker && !e.enabled).length;
    stats.value = { total: entries.length, enabled, disabled, markers };
  } catch (e: any) {
    error.value = e.message || '解析失败';
  }
}
</script>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.panel h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--color-text);
}

.panel-desc {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.error-msg {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg);
  color: var(--color-error);
  border-radius: 8px;
  font-size: 0.9rem;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
  padding: 0.6rem 1rem;
  background: var(--color-surface);
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  flex-wrap: wrap;
}
</style>
