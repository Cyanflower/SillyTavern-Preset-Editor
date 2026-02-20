<template>
  <div class="entry-list">
    <div class="list-header">
      <span class="list-count">{{ entries.length }} 条条目</span>
      <span class="list-stats">
        {{ enabledCount }} 启用 · {{ markerCount }} 标记
      </span>
    </div>

    <div class="list-body">
      <div
        v-for="(entry, idx) in entries"
        :key="entry.id ?? `new-${idx}`"
        class="entry-wrapper"
        draggable="true"
        @dragstart="onDragStart(idx, $event)"
        @dragover.prevent="onDragOver(idx, $event)"
        @dragleave="onDragLeave(idx)"
        @drop.prevent="onDrop(idx)"
        @dragend="onDragEnd"
        :class="{
          'entry-wrapper--dragging': dragIdx === idx,
          'entry-wrapper--over-top': dropIdx === idx && dropPosition === 'top',
          'entry-wrapper--over-bottom': dropIdx === idx && dropPosition === 'bottom',
        }"
      >
        <EntryCard
          :entry="entry"
          :index="idx"
          @update:entry="updateEntry(idx, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ParsedEntry } from '../types/preset';
import EntryCard from './EntryCard.vue';

const props = defineProps<{
  entries: ParsedEntry[];
}>();

const emit = defineEmits<{
  'update:entries': [entries: ParsedEntry[]];
}>();

const enabledCount = computed(() => props.entries.filter(e => e.enabled && !e.marker).length);
const markerCount = computed(() => props.entries.filter(e => e.marker).length);

function updateEntry(index: number, updated: ParsedEntry) {
  const newEntries = [...props.entries];
  newEntries[index] = updated;
  emit('update:entries', newEntries);
}

// ── Drag and drop ──
const dragIdx = ref<number | null>(null);
const dropIdx = ref<number | null>(null);
const dropPosition = ref<'top' | 'bottom'>('top');

function onDragStart(idx: number, event: DragEvent) {
  dragIdx.value = idx;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(idx));
  }
}

function onDragOver(idx: number, event: DragEvent) {
  if (dragIdx.value === null || dragIdx.value === idx) {
    dropIdx.value = null;
    return;
  }

  // Determine top/bottom half of the element
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  dropPosition.value = event.clientY < midY ? 'top' : 'bottom';
  dropIdx.value = idx;
}

function onDragLeave(idx: number) {
  if (dropIdx.value === idx) {
    dropIdx.value = null;
  }
}

function onDrop(idx: number) {
  if (dragIdx.value === null || dragIdx.value === idx) return;

  const from = dragIdx.value;
  const newEntries = [...props.entries];
  const [moved] = newEntries.splice(from, 1);
  if (!moved) return;

  // Calculate correct insert position
  // After removing `from`, indices shift:
  // - if from < idx (dragging down), idx effectively becomes idx-1
  let insertAt: number;
  if (from < idx) {
    // Dragging down
    insertAt = dropPosition.value === 'top' ? idx - 1 : idx;
  } else {
    // Dragging up
    insertAt = dropPosition.value === 'top' ? idx : idx + 1;
  }

  newEntries.splice(insertAt, 0, moved);
  emit('update:entries', newEntries);

  dragIdx.value = null;
  dropIdx.value = null;
}

function onDragEnd() {
  dragIdx.value = null;
  dropIdx.value = null;
}
</script>

<style scoped>
.entry-list {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
  flex-shrink: 0;
}

.list-count {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}

.list-stats {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.list-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding-bottom: 2rem;
}

/* Drag wrapper */
.entry-wrapper {
  position: relative;
  transition: opacity 0.15s, transform 0.1s;
}

.entry-wrapper--dragging {
  opacity: 0.3;
  transform: scale(0.98);
}

.entry-wrapper--over-top::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -3px;
  height: 3px;
  background: var(--color-accent);
  border-radius: 2px;
  pointer-events: none;
}

.entry-wrapper--over-bottom::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 3px;
  background: var(--color-accent);
  border-radius: 2px;
  pointer-events: none;
}
</style>
