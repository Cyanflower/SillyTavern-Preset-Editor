<template>
  <div class="editor-panel">
    <div class="editor-body">
      <!-- Left: MD text editor -->
      <div class="pane pane-left">
        <div class="pane-header">
          <span>📝 Markdown</span>
        </div>
        <MarkdownEditor
          :modelValue="store.mdText.value"
          @update:modelValue="store.updateMdText"
        />
      </div>

      <!-- Divider -->
      <div class="pane-divider"></div>

      <!-- Right: Entry cards -->
      <div class="pane pane-right">
        <div class="pane-header">
          <span>🗂️ 条目列表</span>
        </div>
        <EntryList
          :entries="store.entries.value"
          @update:entries="store.updateEntries"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePresetStore } from '../composables/usePresetStore';
import MarkdownEditor from './MarkdownEditor.vue';
import EntryList from './EntryList.vue';

const store = usePresetStore();
</script>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* Split pane */
.editor-body {
  flex: 1;
  display: flex;
  gap: 0;
  min-height: 0;
}

.pane {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.pane-left {
  flex: 1;
  min-width: 0;
}

.pane-right {
  flex: 1;
  min-width: 0;
}

.pane-divider {
  width: 1px;
  background: var(--color-border);
  margin: 0 0.8rem;
  flex-shrink: 0;
}

.pane-header {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 0.4rem 0;
  flex-shrink: 0;
}
</style>
