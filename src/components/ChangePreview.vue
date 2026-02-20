<template>
  <div class="merge-preview">
    <!-- Summary -->
    <div class="merge-summary">
      <span class="summary-stat unchanged">📄 {{ unchangedCount }} 无变更</span>
      <span class="summary-stat modified">✏️ {{ modifiedCount }} 修改</span>
      <span class="summary-stat added">➕ {{ addedCount }} 新增</span>
      <span class="summary-stat removed">🗑️ {{ removedCount }} 删除</span>
    </div>

    <!-- Merge list -->
    <div ref="listEl" class="merge-list">
      <div
        v-for="(item, idx) in items"
        :key="item.id ?? `item-${idx}`"
        class="merge-item"
        :class="[
          `merge-item--${item.type}`,
          { 'merge-item--excluded': item.decision === 'skip' || item.decision === 'remove' }
        ]"
        :draggable="item.type !== 'removed'"
        @dragstart="onDragStart(idx, $event)"
        @dragover.prevent="onDragOver(idx, $event)"
        @dragend="onDragEnd"
      >
        <!-- Main row -->
        <div class="item-row">
          <!-- Drag handle -->
          <span v-if="item.type !== 'removed'" class="drag-handle" title="拖拽排序">≡</span>
          <span v-else class="drag-handle drag-handle--disabled"></span>

          <!-- Type icon -->
          <span class="item-icon">
            {{ item.type === 'modified' ? '✏️' : item.type === 'added' ? '➕' : item.type === 'removed' ? '🗑️' : '' }}
          </span>

          <!-- Name -->
          <span class="item-name" :class="{ 'item-name--strike': item.decision === 'remove' || item.decision === 'skip' }">
            {{ item.name }}
          </span>

          <!-- Decision controls -->
          <div class="item-controls">
            <!-- Modified: keep current / use new -->
            <template v-if="item.type === 'modified'">
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': item.decision === 'keep' }"
                  @click="setDecision(idx, 'keep')"
                >
                  保留当前
                </button>
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': item.decision === 'use-new' }"
                  @click="setDecision(idx, 'use-new')"
                >
                  使用新版
                </button>
              </div>
            </template>

            <!-- Added: include checkbox -->
            <template v-if="item.type === 'added'">
              <label class="check-label">
                <input
                  type="checkbox"
                  :checked="item.decision === 'include'"
                  @change="setDecision(idx, item.decision === 'include' ? 'skip' : 'include')"
                />
                纳入
              </label>
            </template>

            <!-- Removed: delete / keep -->
            <template v-if="item.type === 'removed'">
              <div class="toggle-group">
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': item.decision === 'remove' }"
                  @click="setDecision(idx, 'remove')"
                >
                  删除
                </button>
                <button
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': item.decision === 'keep' }"
                  @click="setDecision(idx, 'keep')"
                >
                  保留
                </button>
              </div>
            </template>

            <!-- Expand (modified/added only) -->
            <button
              v-if="item.diff && (item.diff.metaChanges?.length || item.diff.contentChanged || item.type === 'added')"
              class="expand-btn"
              :class="{ 'expand-btn--open': expandedSet.has(idx) }"
              @click="toggleExpand(idx)"
            >
              ▶
            </button>
          </div>
        </div>

        <!-- Expanded detail -->
        <div v-if="expandedSet.has(idx)" class="item-detail">
          <!-- Meta changes -->
          <div v-if="item.diff?.metaChanges?.length" class="detail-section">
            <div v-for="mc in item.diff.metaChanges" :key="mc.field" class="meta-change">
              <span class="meta-field">{{ mc.field }}:</span>
              <span class="meta-old">{{ mc.oldVal }}</span>
              <span class="meta-arrow">→</span>
              <span class="meta-new">{{ mc.newVal }}</span>
            </div>
          </div>

          <!-- Content diff -->
          <div v-if="item.diff?.contentChanged" class="detail-section">
            <div class="content-diff">
              <div class="diff-side diff-old">
                <span class="diff-label">旧内容</span>
                <pre>{{ item.diff.oldContent }}{{ (item.diff.oldContent?.length ?? 0) >= 200 ? '...' : '' }}</pre>
              </div>
              <div class="diff-side diff-new">
                <span class="diff-label">新内容</span>
                <pre>{{ item.diff.newContent }}{{ (item.diff.newContent?.length ?? 0) >= 200 ? '...' : '' }}</pre>
              </div>
            </div>
          </div>

          <!-- Added preview -->
          <div v-if="item.type === 'added' && item.incomingEntry" class="detail-section">
            <div class="added-meta">
              <span class="meta-field">role:</span> {{ item.incomingEntry.role }} ·
              <span class="meta-field">depth:</span> {{ item.incomingEntry.depth }}
            </div>
            <pre v-if="item.incomingEntry.content" class="added-content">{{ item.incomingEntry.content.slice(0, 300) }}{{ item.incomingEntry.content.length > 300 ? '...' : '' }}</pre>
          </div>
        </div>

        <!-- Drop indicator -->
        <div v-if="dragOverIdx === idx" class="drop-indicator"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { MergeItem } from '../core/diff-entries';

const props = defineProps<{
  items: MergeItem[];
}>();

const emit = defineEmits<{
  'update:items': [items: MergeItem[]];
}>();

const expandedSet = ref(new Set<number>());

// Stats
const unchangedCount = computed(() => props.items.filter(i => i.type === 'unchanged').length);
const modifiedCount = computed(() => props.items.filter(i => i.type === 'modified').length);
const addedCount = computed(() => props.items.filter(i => i.type === 'added').length);
const removedCount = computed(() => props.items.filter(i => i.type === 'removed').length);

function toggleExpand(idx: number) {
  const s = new Set(expandedSet.value);
  if (s.has(idx)) s.delete(idx);
  else s.add(idx);
  expandedSet.value = s;
}

function setDecision(idx: number, decision: MergeItem['decision']) {
  const newItems = [...props.items];
  newItems[idx] = { ...newItems[idx], decision };
  emit('update:items', newItems);
}

// ── Drag and drop ──
const dragIdx = ref<number | null>(null);
const dragOverIdx = ref<number | null>(null);

function onDragStart(idx: number, event: DragEvent) {
  dragIdx.value = idx;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(idx));
  }
}

function onDragOver(idx: number, _event: DragEvent) {
  if (dragIdx.value === null || dragIdx.value === idx) return;
  // Don't allow dropping on removed items
  if (props.items[idx].type === 'removed') return;
  dragOverIdx.value = idx;
}

function onDragEnd() {
  if (dragIdx.value !== null && dragOverIdx.value !== null && dragIdx.value !== dragOverIdx.value) {
    const newItems = [...props.items];
    const [moved] = newItems.splice(dragIdx.value, 1);
    newItems.splice(dragOverIdx.value, 0, moved);
    // Clear expanded set since indices changed
    expandedSet.value = new Set();
    emit('update:items', newItems);
  }
  dragIdx.value = null;
  dragOverIdx.value = null;
}
</script>

<style scoped>
.merge-preview {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.merge-summary {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.summary-stat {
  font-size: 0.8rem;
  font-weight: 600;
}

.summary-stat.unchanged { color: var(--color-text-secondary); }
.summary-stat.modified { color: var(--color-accent); }
.summary-stat.added { color: var(--color-success); }
.summary-stat.removed { color: var(--color-error); }

/* Merge list */
.merge-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

/* Merge item */
.merge-item {
  border-radius: 6px;
  overflow: hidden;
  transition: opacity 0.15s, background 0.15s;
  position: relative;
  border-left: 3px solid transparent;
}

.merge-item--unchanged {
  background: rgba(255, 255, 255, 0.02);
  border-left-color: transparent;
}

.merge-item--modified {
  background: var(--color-change-modified);
  border-left-color: var(--color-accent);
}

.merge-item--added {
  background: var(--color-change-added);
  border-left-color: var(--color-success);
}

.merge-item--removed {
  background: var(--color-change-removed);
  border-left-color: var(--color-error);
}

.merge-item--excluded {
  opacity: 0.45;
}

.merge-item[draggable="true"] {
  cursor: grab;
}

.merge-item[draggable="true"]:active {
  cursor: grabbing;
}

/* Main row */
.item-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.6rem;
  min-height: 36px;
}

.drag-handle {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  opacity: 0.4;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
}

.drag-handle--disabled {
  visibility: hidden;
}

.item-icon {
  font-size: 0.7rem;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.item-name {
  flex: 1;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-name--strike {
  text-decoration: line-through;
  opacity: 0.6;
}

/* Controls */
.item-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.toggle-group {
  display: flex;
  border: 1px solid var(--color-border);
  border-radius: 5px;
  overflow: hidden;
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

.check-label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.check-label input {
  accent-color: var(--color-accent);
}

.expand-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 0.55rem;
  cursor: pointer;
  padding: 0.2rem;
  transition: transform 0.15s;
}

.expand-btn--open {
  transform: rotate(90deg);
}

/* Detail */
.item-detail {
  padding: 0.5rem 0.6rem 0.6rem 2.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.detail-section + .detail-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
}

/* Meta changes */
.meta-change {
  font-size: 0.75rem;
  padding: 0.1rem 0;
}

.meta-field {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.meta-old {
  color: var(--color-error);
  text-decoration: line-through;
}

.meta-arrow {
  color: var(--color-text-secondary);
  margin: 0 0.3rem;
}

.meta-new {
  color: var(--color-success);
}

/* Content diff */
.content-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.diff-side {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.diff-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.diff-old .diff-label { color: var(--color-error); }
.diff-new .diff-label { color: var(--color-success); }

.diff-side pre,
.added-content {
  margin: 0;
  padding: 0.35rem 0.5rem;
  background: var(--color-bg-deep);
  border-radius: 4px;
  font-size: 0.7rem;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 100px;
  overflow-y: auto;
  color: var(--color-text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.added-meta {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.3rem;
}

/* Drop indicator */
.drop-indicator {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  background: var(--color-accent);
  pointer-events: none;
}
</style>
