<template>
  <Teleport to="body">
    <div v-if="visible" class="dialog-backdrop" @click.self="$emit('cancel')">
      <div class="import-dialog">
        <!-- Header -->
        <div class="dialog-header">
          <h3>📥 导入 JSON</h3>
          <div class="dialog-steps" v-if="fileLoaded">
            <span class="step" :class="{ 'step--active': step === 1 }">① 条目合并</span>
            <span class="step" :class="{ 'step--active': step === 2 }">② 采样参数</span>
          </div>
          <button class="dialog-close" @click="$emit('cancel')">✕</button>
        </div>

        <!-- Step 0: File upload -->
        <div v-if="!fileLoaded" class="dialog-body">
          <div class="upload-zone" @click="pickFile">
            <div class="upload-icon">📄</div>
            <p>点击选择 JSON 预设文件</p>
            <p class="upload-hint">将与当前条目和采样参数进行对比</p>
          </div>
        </div>

        <!-- Step 1: Entry merge -->
        <div v-else-if="step === 1" class="dialog-body">
          <ChangePreview
            :items="mergeItems"
            @update:items="mergeItems = $event"
          />
        </div>

        <!-- Step 2: Sampling params -->
        <div v-else-if="step === 2" class="dialog-body">
          <div v-if="samplingDiffs.length === 0" class="no-changes">
            <p>✅ 采样参数完全一致</p>
          </div>

          <div v-else class="params-list">
            <div class="params-header">
              <span>参数</span>
              <span>当前值</span>
              <span>导入值</span>
              <span>决策</span>
            </div>
            <div
              v-for="(pd, idx) in samplingDiffs"
              :key="pd.key"
              class="param-row"
            >
              <span class="param-label">{{ pd.label }}</span>
              <span class="param-val param-val--current">{{ formatVal(pd.currentVal) }}</span>
              <span class="param-val param-val--incoming">{{ formatVal(pd.incomingVal) }}</span>
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': pd.decision === 'keep' }"
                  @click="setParamDecision(idx, 'keep')"
                >
                  保留当前
                </button>
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': pd.decision === 'use-new' }"
                  @click="setParamDecision(idx, 'use-new')"
                >
                  使用新版
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="dialog-footer">
          <button class="btn btn-secondary" @click="$emit('cancel')">取消</button>

          <template v-if="fileLoaded">
            <button
              v-if="step === 1"
              class="btn btn-accent"
              @click="step = 2"
            >
              下一步 →
            </button>
            <button
              v-if="step === 2"
              class="btn btn-secondary"
              @click="step = 1"
            >
              ← 上一步
            </button>
            <button
              v-if="step === 2"
              class="btn btn-accent"
              @click="applyAll"
            >
              ✅ 应用变更
            </button>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SillyTavernPreset, ParsedEntry } from '../types/preset';
import { jsonToEntries, diffSamplingParams, applySamplingParams, type SamplingParamDiff } from '../core/json-import';
import { buildMergeList, applyMergeList, type MergeItem } from '../core/diff-entries';
import ChangePreview from './ChangePreview.vue';

const props = defineProps<{
  visible: boolean;
  currentEntries: ParsedEntry[];
  currentPreset: SillyTavernPreset | null;
}>();

const emit = defineEmits<{
  'cancel': [];
  'apply': [entries: ParsedEntry[], preset: SillyTavernPreset | null];
}>();

const fileLoaded = ref(false);
const step = ref(1);
const mergeItems = ref<MergeItem[]>([]);
const samplingDiffs = ref<SamplingParamDiff[]>([]);
let incomingPreset: SillyTavernPreset | null = null;

// Reset on open
watch(() => props.visible, (val) => {
  if (val) {
    fileLoaded.value = false;
    step.value = 1;
    mergeItems.value = [];
    samplingDiffs.value = [];
    incomingPreset = null;
  }
});

function pickFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as SillyTavernPreset;
        incomingPreset = json;

        // Entries diff
        const incomingEntries = jsonToEntries(json);
        mergeItems.value = buildMergeList(props.currentEntries, incomingEntries);

        // Sampling params diff
        if (props.currentPreset) {
          samplingDiffs.value = diffSamplingParams(props.currentPreset, json);
        }

        fileLoaded.value = true;
      } catch (e) {
        alert('JSON 解析失败: ' + (e as Error).message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function setParamDecision(idx: number, decision: 'keep' | 'use-new') {
  const newDiffs = [...samplingDiffs.value];
  newDiffs[idx] = { ...newDiffs[idx], decision };
  samplingDiffs.value = newDiffs;
}

function formatVal(val: unknown): string {
  if (val === undefined || val === null) return '—';
  if (typeof val === 'boolean') return val ? '✓' : '✗';
  return String(val);
}

function applyAll() {
  // Apply entries
  const resultEntries = applyMergeList(mergeItems.value);

  // Apply sampling params
  let resultPreset: SillyTavernPreset | null = null;
  if (props.currentPreset && samplingDiffs.value.length > 0) {
    resultPreset = applySamplingParams(props.currentPreset, samplingDiffs.value);
  }

  emit('apply', resultEntries, resultPreset);
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
  align-items: center;
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  gap: 1rem;
}

.dialog-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.dialog-steps {
  display: flex;
  gap: 0.8rem;
  margin-left: auto;
  margin-right: 0.8rem;
}

.step {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  opacity: 0.5;
}

.step--active {
  color: var(--color-accent);
  opacity: 1;
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

/* No changes */
.no-changes {
  text-align: center;
  padding: 2rem;
  color: var(--color-success);
}

/* Sampling params */
.params-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.params-header {
  display: grid;
  grid-template-columns: 1fr 90px 90px 140px;
  gap: 0.8rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.param-row {
  display: grid;
  grid-template-columns: 1fr 90px 90px 140px;
  gap: 0.8rem;
  align-items: center;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.02);
}

.param-row:nth-child(odd) {
  background: rgba(255, 255, 255, 0.04);
}

.param-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text);
}

.param-val {
  font-size: 0.78rem;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.param-val--current {
  color: var(--color-text-secondary);
}

.param-val--incoming {
  color: var(--color-accent);
}

/* Toggle group (reused from ChangePreview) */
.toggle-group {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  overflow: hidden;
  justify-self: start;
}

.toggle-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.68rem;
  font-family: inherit;
  background: transparent;
  color: var(--color-text-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}

.toggle-btn:not(:last-child) {
  border-right: 1px solid var(--color-border);
}

.toggle-btn--active {
  background: var(--color-accent);
  color: #fff;
}
</style>
