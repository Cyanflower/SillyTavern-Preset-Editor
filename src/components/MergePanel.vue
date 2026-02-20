<template>
  <div class="panel">
    <h2>Markdown → JSON（合并）</h2>
    <p class="panel-desc">上传编辑后的 MD 文件和原始 JSON 文件，将改动合并回 JSON。</p>

    <div class="upload-row">
      <FileDropZone
        label="编辑后的 Markdown 文件"
        accept=".md"
        @file-loaded="onMdLoaded"
      />
      <FileDropZone
        label="原始 JSON 预设文件"
        accept=".json"
        @file-loaded="onJsonLoaded"
      />
    </div>

    <div v-if="error" class="error-msg">⚠️ {{ error }}</div>

    <button
      v-if="mdContent && jsonContent"
      class="btn btn-accent merge-btn"
      @click="doMerge"
    >
      🔀 执行合并
    </button>

    <!-- 变更列表 -->
    <div v-if="changes.length > 0" class="changes-section">
      <h3>📋 变更列表 ({{ changes.length }} 项)</h3>
      <div class="change-list">
        <div
          v-for="(change, idx) in changes"
          :key="idx"
          class="change-item"
          :class="'change-' + change.type"
        >
          <span class="change-badge">{{ changeLabel(change.type) }}</span>
          <span class="change-name">{{ change.name }}</span>
          <span v-if="change.details" class="change-details">{{ change.details }}</span>
        </div>
      </div>
    </div>

    <div v-if="noChanges" class="no-changes">
      ✅ 没有检测到变更，MD 与原始 JSON 一致。
    </div>

    <PreviewPanel
      v-if="mergedJson"
      title="合并后的 JSON"
      :content="mergedJson"
      placeholder=""
      :download-filename="downloadName"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import FileDropZone from './FileDropZone.vue';
import PreviewPanel from './PreviewPanel.vue';
import { mergeBack, type ChangeEntry } from '../core/merge-back';
import type { SillyTavernPreset } from '../types/preset';

const mdContent = ref('');
const jsonContent = ref('');
const jsonFilename = ref('');
const error = ref('');
const mergedJson = ref('');
const changes = ref<ChangeEntry[]>([]);
const noChanges = ref(false);

const downloadName = computed(() => {
  const base = jsonFilename.value.replace(/\.json$/i, '');
  return base ? `${base}-merged.json` : 'preset-merged.json';
});

function onMdLoaded(content: string, _filename: string) {
  mdContent.value = content;
  resetOutput();
}

function onJsonLoaded(content: string, filename: string) {
  jsonContent.value = content;
  jsonFilename.value = filename;
  resetOutput();
}

function resetOutput() {
  mergedJson.value = '';
  changes.value = [];
  error.value = '';
  noChanges.value = false;
}

function doMerge() {
  error.value = '';
  mergedJson.value = '';
  changes.value = [];
  noChanges.value = false;

  try {
    const preset: SillyTavernPreset = JSON.parse(jsonContent.value);

    if (!preset.prompts || !preset.prompt_order) {
      throw new Error('JSON 文件不是有效的 SillyTavern 预设');
    }

    const result = mergeBack(mdContent.value, preset);
    changes.value = result.changes;
    mergedJson.value = JSON.stringify(result.preset, null, 4);

    if (result.changes.length === 0) {
      noChanges.value = true;
    }
  } catch (e: any) {
    error.value = e.message || '合并失败';
  }
}

function changeLabel(type: string): string {
  switch (type) {
    case 'modified': return '✏️ 修改';
    case 'added': return '➕ 新增';
    case 'removed': return '🗑️ 删除';
    default: return type;
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

.upload-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.error-msg {
  padding: 0.75rem 1rem;
  background: var(--color-error-bg);
  color: var(--color-error);
  border-radius: 8px;
  font-size: 0.9rem;
}

.merge-btn {
  align-self: center;
  font-size: 1rem;
  padding: 0.75rem 2rem;
}

.changes-section h3 {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--color-text);
}

.change-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.5rem;
  background: var(--color-surface);
  border-radius: 8px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.change-modified { background: var(--color-change-modified); }
.change-added { background: var(--color-change-added); }
.change-removed { background: var(--color-change-removed); }

.change-badge {
  font-size: 0.8rem;
  white-space: nowrap;
}

.change-name {
  color: var(--color-text);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-details {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  white-space: nowrap;
}

.no-changes {
  padding: 1rem;
  text-align: center;
  color: var(--color-success);
  background: var(--color-surface);
  border-radius: 8px;
  font-size: 0.9rem;
}
</style>
