<template>
  <div class="app">
    <!-- Toolbar -->
    <header class="toolbar">
      <div class="toolbar-left">
        <h1 class="app-title">🔄 SillyTavern Preset Converter</h1>
        <span v-if="store.loaded.value" class="toolbar-filename">
          {{ store.filename.value }}
        </span>
      </div>

      <div class="toolbar-actions">
        <button class="btn btn-secondary" @click="store.createNew()">
          ➕ 新建
        </button>
        <label class="btn btn-secondary">
          📂 加载 JSON
          <input type="file" accept=".json" hidden @change="onLoadJson" />
        </label>
        <button class="btn btn-secondary" @click="onImportMd">
          📥 导入 MD
        </button>

        <template v-if="store.loaded.value">
          <button class="btn btn-secondary" @click="onImportJson">
            📥 导入 JSON
          </button>
          <button class="btn btn-secondary" @click="openSamplingParams">
            ⚙️ 采样参数
          </button>
          <button class="btn btn-secondary" @click="openExportMd">
            📤 导出 MD
          </button>
          <button class="btn btn-accent" @click="openExportJson">
            💾 导出 JSON
          </button>
        </template>
      </div>
    </header>

    <!-- Main content -->
    <main class="main">
      <div v-if="!store.loaded.value" class="empty-state">
        <div class="empty-icon">📋</div>
        <p>加载 JSON 预设文件开始编辑</p>
      </div>

      <EditorPanel v-else />
    </main>

    <!-- Save dialog -->
    <SaveDialog
      :visible="saveDialogVisible"
      title="保存文件"
      v-model="pendingFilename"
      @confirm="onSaveConfirm"
      @cancel="saveDialogVisible = false"
    />

    <!-- Import MD dialog -->
    <ImportDialog
      :visible="importDialogVisible"
      :currentEntries="store.entries.value"
      @cancel="importDialogVisible = false"
      @apply="onImportApply"
    />

    <!-- Import JSON dialog -->
    <ImportJsonDialog
      :visible="importJsonDialogVisible"
      :currentEntries="store.entries.value"
      :currentPreset="store.originalPreset.value"
      @cancel="importJsonDialogVisible = false"
      @apply="onImportJsonApply"
    />

    <!-- Export JSON marker validation dialog -->
    <Teleport to="body">
      <div v-if="exportValidationVisible" class="dialog-backdrop" @click.self="exportValidationVisible = false">
        <div class="export-validation-dialog">
          <h3 class="dialog-title">⚠ 缺少标准 Marker</h3>
          <p class="dialog-desc">以下 marker 条目缺失，导出的 JSON 在 SillyTavern 中可能无法正常工作：</p>
          <ul class="missing-list">
            <li v-for="m in exportMissingMarkers" :key="m.id">{{ m.name }} <code>{{ m.id }}</code></li>
          </ul>
          <div class="dialog-actions">
            <button class="btn btn-secondary" @click="doExportJson">继续导出</button>
            <button class="btn btn-secondary" @click="exportValidationVisible = false">取消</button>
            <button class="btn btn-accent" @click="addMarkersAndCancel">取消并自动补全</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Sampling params dialog -->
    <SamplingParamsDialog
      :visible="samplingParamsDialogVisible"
      :preset="store.originalPreset.value"
      @cancel="samplingParamsDialogVisible = false"
      @save="onSamplingParamsSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { usePresetStore } from './composables/usePresetStore';
import type { ParsedEntry, SillyTavernPreset } from './types/preset';
import { REQUIRED_MARKERS } from './core/default-template';
import EditorPanel from './components/EditorPanel.vue';
import SaveDialog from './components/SaveDialog.vue';
import ImportDialog from './components/ImportDialog.vue';
import ImportJsonDialog from './components/ImportJsonDialog.vue';
import SamplingParamsDialog from './components/SamplingParamsDialog.vue';

const store = usePresetStore();

// ── Load JSON ──
async function onLoadJson(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  try {
    await store.loadJson(file);
  } catch (e) {
    alert('JSON 解析失败: ' + (e as Error).message);
  }
  input.value = '';
}

// ── Export ──
const saveDialogVisible = ref(false);
const pendingFilename = ref('');
let pendingContent = '';
let pendingMimeType = '';

function openExportMd() {
  pendingFilename.value = store.filename.value.replace(/\.json$/i, '.md');
  pendingContent = store.getExportMd();
  pendingMimeType = 'text/markdown';
  saveDialogVisible.value = true;
}

// ── Export JSON validation ──
const exportValidationVisible = ref(false);
const exportMissingMarkers = ref<{ id: string; name: string }[]>([]);

function openExportJson() {
  const existingIds = new Set(store.entries.value.map(e => e.id));
  const missing = REQUIRED_MARKERS.filter(m => !existingIds.has(m.id));
  if (missing.length > 0) {
    exportMissingMarkers.value = missing;
    exportValidationVisible.value = true;
    return;
  }
  doExportJson();
}

function doExportJson() {
  exportValidationVisible.value = false;
  pendingFilename.value = store.filename.value;
  pendingContent = store.getExportJson();
  pendingMimeType = 'application/json';
  saveDialogVisible.value = true;
}

function addMarkersAndCancel() {
  const toAdd: ParsedEntry[] = exportMissingMarkers.value.map(m => ({
    name: m.name,
    id: m.id,
    role: 'system' as const,
    enabled: true,
    depth: 0,
    position: 0,
    order: null,
    systemPrompt: true,
    marker: true,
    forbidOverrides: false,
    injectionTrigger: [],
    content: '',
  }));
  store.applyEntries([...store.entries.value, ...toAdd]);
  exportValidationVisible.value = false;
}

function onSaveConfirm(name: string) {
  saveDialogVisible.value = false;
  const blob = new Blob([pendingContent], { type: pendingMimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Import MD ──
const importDialogVisible = ref(false);

function onImportMd() {
  if (!store.loaded.value) {
    store.createNew(); // 无 JSON 时自动创建默认预设作为基底
  }
  importDialogVisible.value = true;
}

function onImportApply(newEntries: ParsedEntry[]) {
  importDialogVisible.value = false;
  store.applyEntries(newEntries);
}

// ── Import JSON ──
const importJsonDialogVisible = ref(false);

function onImportJson() {
  importJsonDialogVisible.value = true;
}

function onImportJsonApply(newEntries: ParsedEntry[], updatedPreset: SillyTavernPreset | null) {
  importJsonDialogVisible.value = false;
  store.applyEntries(newEntries);
  if (updatedPreset) {
    store.updateOriginalPreset(updatedPreset);
  }
}

// ── Sampling Params ──
const samplingParamsDialogVisible = ref(false);

function openSamplingParams() {
  samplingParamsDialogVisible.value = true;
}

function onSamplingParamsSave(updated: SillyTavernPreset) {
  samplingParamsDialogVisible.value = false;
  store.updateOriginalPreset(updated);
}
</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
}

/* Toolbar */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.app-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.toolbar-filename {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  font-family: monospace;
  background: var(--color-bg);
  padding: 0.2rem 0.6rem;
  border-radius: 5px;
}

.toolbar-actions {
  display: flex;
  gap: 0.5rem;
}

/* Main */
.main {
  flex: 1;
  min-height: 0;
  padding: 0.8rem 1.5rem;
  display: flex;
  flex-direction: column;
}

/* Empty state */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.3;
}

.empty-state p {
  font-size: 0.9rem;
}

/* Export validation dialog */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.export-validation-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  width: 420px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.dialog-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #f59e0b;
}

.dialog-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.missing-list {
  margin: 0;
  padding-left: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.missing-list li {
  font-size: 0.83rem;
  color: var(--color-text);
}

.missing-list code {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  margin-left: 0.3rem;
}

.dialog-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
</style>
