<template>
  <div ref="editorContainer" class="cm-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const editorContainer = ref<HTMLElement>();
let view: EditorView | null = null;
let isInternal = false; // guards against circular updates

const customTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '13px',
  },
  '.cm-scroller': {
    fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace",
    lineHeight: '1.6',
  },
  '.cm-gutters': {
    background: 'var(--color-bg-deep)',
    border: 'none',
  },
  '.cm-activeLineGutter': {
    background: 'rgba(99, 102, 241, 0.1)',
  },
  '.cm-activeLine': {
    background: 'rgba(99, 102, 241, 0.06)',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--color-accent)',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    background: 'rgba(99, 102, 241, 0.2) !important',
  },
});

onMounted(() => {
  if (!editorContainer.value) return;

  const state = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      foldGutter(),
      indentOnInput(),
      bracketMatching(),
      highlightSelectionMatches(),
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      markdown({ codeLanguages: languages }),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      oneDark,
      customTheme,
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged && !isInternal) {
          emit('update:modelValue', update.state.doc.toString());
        }
      }),
    ],
  });

  view = new EditorView({
    state,
    parent: editorContainer.value,
  });
});

onUnmounted(() => {
  view?.destroy();
  view = null;
});

// External update → write to editor without triggering emit
watch(
  () => props.modelValue,
  (newVal) => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === newVal) return;

    isInternal = true;
    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: newVal,
      },
    });
    isInternal = false;
  }
);
</script>

<style scoped>
.cm-wrapper {
  height: 100%;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.cm-wrapper :deep(.cm-editor) {
  height: 100%;
}

.cm-wrapper :deep(.cm-scroller) {
  overflow: auto !important;
}

.cm-wrapper :deep(.cm-scroller)::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.cm-wrapper :deep(.cm-scroller)::-webkit-scrollbar-track {
  background: var(--color-bg-deep);
}

.cm-wrapper :deep(.cm-scroller)::-webkit-scrollbar-thumb {
  background: #3a3a50;
  border-radius: 5px;
}

.cm-wrapper :deep(.cm-scroller)::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}
</style>
