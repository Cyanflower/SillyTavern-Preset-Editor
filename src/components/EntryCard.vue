<template>
  <div class="entry-card" :class="[
    `entry-card--role-${entry.role}`,
    { 'entry-card--marker': entry.marker, 'entry-card--disabled': !entry.enabled }
  ]">
    <!-- Color bar / drag handle -->
    <div class="card-drag-bar" title="拖拽排序">
      <span class="drag-icon">≡</span>
    </div>

    <!-- Card body -->
    <div class="card-body">
    <!-- Header -->
    <div class="card-header">
      <span class="card-index">{{ index + 1 }}</span>

      <template v-if="entry.marker">
        <input
          class="card-title-input"
          :value="entry.name"
          @input="emit('update:entry', { ...entry, name: ($event.target as HTMLInputElement).value })"
        />
        <span class="card-badge badge-marker">MARKER</span>
        <label class="card-toggle" :title="entry.enabled ? '已启用' : '已禁用'">
          <input
            type="checkbox"
            :checked="entry.enabled"
            @change="emit('update:entry', { ...entry, enabled: ($event.target as HTMLInputElement).checked })"
          />
          <span class="toggle-slider"></span>
        </label>
      </template>

      <template v-else>
        <input
          class="card-title-input"
          :value="entry.name"
          @input="emit('update:entry', { ...entry, name: ($event.target as HTMLInputElement).value })"
        />
        <label class="card-toggle" :title="entry.enabled ? '已启用' : '已禁用'">
          <input
            type="checkbox"
            :checked="entry.enabled"
            @change="emit('update:entry', { ...entry, enabled: ($event.target as HTMLInputElement).checked })"
          />
          <span class="toggle-slider"></span>
        </label>
      </template>

      <button
        class="btn-delete"
        title="删除条目"
        @click="confirmDelete = true"
      >🗑</button>
    </div>

    <!-- 删除确认行 -->
    <div v-if="confirmDelete" class="delete-confirm">
      <span class="delete-confirm-text">确认删除此条目？</span>
      <button class="btn-confirm-yes" @click="emit('delete')">删除</button>
      <button class="btn-confirm-no" @click="confirmDelete = false">取消</button>
    </div>

    <!-- Settings: non-marker + non-chatHistory markers -->
    <div v-if="!entry.marker || (entry.marker && !isChatHistory)" class="card-settings">
      <div class="setting-group">
        <label>Role</label>
        <select
          :value="entry.role"
          @change="emit('update:entry', { ...entry, role: ($event.target as HTMLSelectElement).value as 'system' | 'user' | 'assistant' })"
        >
          <option value="system">system</option>
          <option value="user">user</option>
          <option value="assistant">assistant</option>
        </select>
      </div>

      <div class="setting-group">
        <label>Position</label>
        <select
          :value="entry.position"
          @change="emit('update:entry', { ...entry, position: parseInt(($event.target as HTMLSelectElement).value) })"
        >
          <option :value="0">相对</option>
          <option :value="1">聊天中</option>
        </select>
      </div>

      <template v-if="entry.position === 1">
        <div class="setting-group">
          <label>Depth</label>
          <input
            type="number"
            class="setting-number"
            :value="entry.depth"
            min="0"
            @input="emit('update:entry', { ...entry, depth: parseInt(($event.target as HTMLInputElement).value) || 0 })"
          />
        </div>

        <div class="setting-group">
          <label>Order</label>
          <input
            type="number"
            class="setting-number"
            :value="entry.order ?? 100"
            min="0"
            @input="emit('update:entry', { ...entry, order: parseInt(($event.target as HTMLInputElement).value) || 0 })"
          />
        </div>
      </template>

      <template v-if="!entry.marker">
        <div class="setting-group setting-check">
          <label>
            <input
              type="checkbox"
              :checked="entry.systemPrompt"
              @change="emit('update:entry', { ...entry, systemPrompt: ($event.target as HTMLInputElement).checked })"
            />
            System Prompt
          </label>
        </div>

        <div class="setting-group setting-check">
          <label>
            <input
              type="checkbox"
              :checked="entry.forbidOverrides"
              @change="emit('update:entry', { ...entry, forbidOverrides: ($event.target as HTMLInputElement).checked })"
            />
            Forbid Overrides
          </label>
        </div>
      </template>
    </div>

    <!-- Content (non-marker only) -->
    <div v-if="!entry.marker && entry.content" class="card-content">
      <textarea
        class="content-textarea"
        :value="entry.content"
        @input="emit('update:entry', { ...entry, content: ($event.target as HTMLTextAreaElement).value })"
        rows="3"
      ></textarea>
    </div>

    <!-- ID badge -->
    <div v-if="entry.id" class="card-footer">
      <span class="card-id">{{ entry.id }}</span>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ParsedEntry } from '../types/preset';

const props = defineProps<{
  entry: ParsedEntry;
  index: number;
}>();

const isChatHistory = computed(() =>
  props.entry.id === 'chatHistory' || props.entry.id === 'dialogueExamples'
);

const confirmDelete = ref(false);

const emit = defineEmits<{
  'update:entry': [entry: ParsedEntry];
  'delete': [];
}>();
</script>

<style scoped>
.entry-card {
  display: flex;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.entry-card:hover {
  box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.1);
}

/* Role-based left border colors */
/* Color bar / drag handle */
.card-drag-bar {
  width: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: grab;
  background: var(--color-border);
  transition: width 0.18s ease, background 0.15s;
}

.card-drag-bar:hover {
  width: 32px;
}

.card-drag-bar:active {
  cursor: grabbing;
}

.drag-icon {
  font-size: 0.8rem;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.2);
  user-select: none;
  transition: font-size 0.18s ease, color 0.15s;
}

.card-drag-bar:hover .drag-icon {
  font-size: 1.1rem;
  color: rgba(0, 0, 0, 0.5);
}

.entry-card--role-system .card-drag-bar {
  background: #6366f1;
}

.entry-card--role-user .card-drag-bar {
  background: #34d399;
}

.entry-card--role-assistant .card-drag-bar {
  background: #fbbf24;
}

/* Card body */
.card-body {
  flex: 1;
  min-width: 0;
  padding: 0.8rem 1rem;
}

.entry-card--marker {
  border-style: dashed;
}

.entry-card--disabled {
  opacity: 0.6;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.card-index {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  flex-shrink: 0;
}

.card-title-input {
  flex: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  padding: 0.3rem 0.5rem;
  transition: border-color 0.15s;
}

.card-title-input:hover {
  border-color: var(--color-border);
}

.card-title-input:focus {
  outline: none;
  border-color: var(--color-accent);
  background: var(--color-bg);
}

.card-title-static {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.card-badge {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.badge-marker {
  background: rgba(136, 136, 160, 0.15);
  color: var(--color-text-secondary);
}

/* Toggle */
.card-toggle {
  position: relative;
  width: 32px;
  height: 18px;
  flex-shrink: 0;
  cursor: pointer;
}

.card-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--color-border);
  border-radius: 9px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 14px;
  height: 14px;
  left: 2px;
  top: 2px;
  background: var(--color-text-secondary);
  border-radius: 50%;
  transition: transform 0.2s, background 0.2s;
}

.card-toggle input:checked + .toggle-slider {
  background: var(--color-accent);
}

.card-toggle input:checked + .toggle-slider::before {
  transform: translateX(14px);
  background: #fff;
}

/* Settings */
.card-settings {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.6rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--color-border);
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.setting-group label {
  font-size: 0.72rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.setting-group select,
.setting-number {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 5px;
  padding: 0.25rem 0.4rem;
  font-size: 0.78rem;
  font-family: inherit;
}

.setting-number {
  width: 52px;
  text-align: center;
}

.setting-group select:focus,
.setting-number:focus {
  outline: none;
  border-color: var(--color-accent);
}

.setting-check label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  cursor: pointer;
}

.setting-check input[type="checkbox"] {
  accent-color: var(--color-accent);
}

/* Content */
.card-content {
  margin-top: 0.6rem;
}

.content-textarea {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.8rem;
  font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
  line-height: 1.5;
  padding: 0.5rem 0.6rem;
  resize: vertical;
  min-height: 60px;
}

.content-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

/* Delete button */
.btn-delete {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  cursor: pointer;
  padding: 0.18rem 0.45rem;
  border-radius: 5px;
  font-size: 0.75rem;
  line-height: 1;
  flex-shrink: 0;
  transition: background 0.15s, border-color 0.15s;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.5);
}

/* Delete confirm */
.delete-confirm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: 6px;
}

.delete-confirm-text {
  flex: 1;
  font-size: 0.8rem;
  color: #ef4444;
}

.btn-confirm-yes {
  background: #ef4444;
  color: #fff;
  border: none;
  border-radius: 5px;
  padding: 0.25rem 0.7rem;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.btn-confirm-yes:hover {
  background: #dc2626;
}

.btn-confirm-no {
  background: var(--color-border);
  color: var(--color-text);
  border: none;
  border-radius: 5px;
  padding: 0.25rem 0.7rem;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
}

.btn-confirm-no:hover {
  background: var(--color-surface);
}

/* Footer */
.card-footer {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
}

.card-id {
  font-size: 0.65rem;
  color: var(--color-text-secondary);
  opacity: 0.6;
  font-family: monospace;
}
</style>
