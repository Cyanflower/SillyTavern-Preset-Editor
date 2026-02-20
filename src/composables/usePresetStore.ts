import { ref, computed } from 'vue';
import type { SillyTavernPreset, ParsedEntry } from '../types/preset';
import { jsonToMd } from '../core/json-to-md';
import { parseMdWithMarkers } from '../core/md-parser';
import { mergeBack } from '../core/merge-back';
import { createDefaultPreset } from '../core/default-template';

// ── Singleton reactive state ──
const originalPreset = ref<SillyTavernPreset | null>(null);
const filename = ref('');
const mdText = ref('');
const entries = ref<ParsedEntry[]>([]);
const loaded = ref(false);

// Sync guard
let syncSource: 'left' | 'right' | null = null;

/**
 * 全局预设状态管理
 * 所有组件通过此 composable 共享同一份状态
 */
export function usePresetStore() {

    // ── Actions ──

    /** 加载 JSON 文件 */
    function loadJson(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const json = JSON.parse(reader.result as string) as SillyTavernPreset;
                    originalPreset.value = json;
                    filename.value = file.name;
                    const md = jsonToMd(json, file.name);
                    mdText.value = md;
                    entries.value = parseMdWithMarkers(md);
                    loaded.value = true;
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsText(file);
        });
    }

    /** 左侧 MD 编辑 → 更新 entries */
    function updateMdText(text: string) {
        if (syncSource === 'right') return;
        syncSource = 'left';

        mdText.value = text;
        try {
            entries.value = parseMdWithMarkers(text);
        } catch {
            // 解析错误保持旧 entries
        }

        syncSource = null;
    }

    /** 右侧条目编辑 → 重建 MD */
    function updateEntries(newEntries: ParsedEntry[]) {
        syncSource = 'right';
        entries.value = newEntries;
        mdText.value = rebuildMdFromEntries(newEntries);
        syncSource = null;
    }

    /** 获取导出用的 MD 文本 */
    function getExportMd(): string {
        return mdText.value;
    }

    /** 获取导出用的 JSON 字符串 */
    function getExportJson(): string {
        if (!originalPreset.value) return '';
        const result = mergeBack(mdText.value, originalPreset.value);
        return JSON.stringify(result.preset, null, 2);
    }

    /** 应用外部 entries 变更（来自导入/合并） */
    function applyEntries(newEntries: ParsedEntry[]) {
        syncSource = 'right';
        entries.value = newEntries;
        mdText.value = rebuildMdFromEntries(newEntries);
        syncSource = null;
    }

    /** 更新原始 preset（采样参数合并后） */
    function updateOriginalPreset(preset: SillyTavernPreset) {
        originalPreset.value = preset;
    }

    /** 新建空白 preset（基于默认模板） */
    function createNew() {
        const preset = createDefaultPreset();
        originalPreset.value = preset;
        filename.value = 'new_preset.json';
        const md = jsonToMd(preset, 'new_preset.json');
        mdText.value = md;
        entries.value = parseMdWithMarkers(md);
        loaded.value = true;
    }

    return {
        // State (readonly externally)
        originalPreset: computed(() => originalPreset.value),
        filename: computed(() => filename.value),
        mdText: computed(() => mdText.value),
        entries: computed(() => entries.value),
        loaded: computed(() => loaded.value),
        // Actions
        loadJson,
        updateMdText,
        updateEntries,
        getExportMd,
        getExportJson,
        applyEntries,
        updateOriginalPreset,
        createNew,
    };
}

// ── Internal helpers ──

function rebuildMdFromEntries(parsedEntries: ParsedEntry[]): string {
    const lines: string[] = [];

    lines.push(`<!-- preset-converter-version: 1.0 -->`);
    if (filename.value) {
        lines.push(`<!-- source: ${filename.value} -->`);
    }
    lines.push(`<!-- prompt_order_character_id: 100001 -->`);
    lines.push('');

    for (const entry of parsedEntries) {
        lines.push('---');
        lines.push('');

        const markerSuffix = entry.marker ? ' [MARKER]' : '';
        lines.push(`## ${entry.name}${markerSuffix}`);

        const metaParts: string[] = [];
        if (entry.id) metaParts.push(`id: ${entry.id}`);

        if (entry.marker) {
            metaParts.push('marker: true');
            metaParts.push(`enabled: ${entry.enabled}`);

            // Non-chatHistory markers support role/position/depth/order
            if (entry.id !== 'chatHistory' && entry.id !== 'dialogueExamples') {
                metaParts.push(`role: ${entry.role}`);
                metaParts.push(`depth: ${entry.depth}`);

                if (entry.position !== 0) {
                    metaParts.push(`position: ${entry.position}`);
                }
                if (entry.order !== null && entry.order !== 100) {
                    metaParts.push(`order: ${entry.order}`);
                }
            }
        } else {
            metaParts.push(`role: ${entry.role}`);
            metaParts.push(`enabled: ${entry.enabled}`);
            metaParts.push(`depth: ${entry.depth}`);

            if (entry.position !== 0) {
                metaParts.push(`position: ${entry.position}`);
            }
            if (entry.order !== null && entry.order !== 100) {
                metaParts.push(`order: ${entry.order}`);
            }
            if (entry.systemPrompt) {
                metaParts.push('system_prompt: true');
            }
            if (entry.forbidOverrides) {
                metaParts.push('forbid_overrides: true');
            }
            if (entry.injectionTrigger && entry.injectionTrigger.length > 0) {
                metaParts.push(`trigger: ${entry.injectionTrigger.join(',')}`);
            }
        }

        lines.push(`<!-- ${metaParts.join(' | ')} -->`);
        lines.push('');

        const content = entry.content ?? '';
        if (content.trim()) {
            lines.push('<entry-content>');
            lines.push(content);
            lines.push('</entry-content>');
            lines.push('');
        }
    }

    return lines.join('\n');
}
