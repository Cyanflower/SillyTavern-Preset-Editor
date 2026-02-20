import type { SillyTavernPreset, PromptEntry, ParsedEntry, PromptOrderItem } from '../types/preset';
import { parseMd } from './md-parser';

const TARGET_CHARACTER_ID = 100001;

/** 合并变更的摘要 */
export interface MergeResult {
    /** 合并后的新 JSON */
    preset: SillyTavernPreset;
    /** 变更详情 */
    changes: ChangeEntry[];
}

export interface ChangeEntry {
    type: 'modified' | 'added' | 'removed';
    name: string;
    id: string;
    details?: string;
}

/**
 * 生成随机 UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * 内置 marker 标识符列表
 */
const BUILTIN_MARKERS = new Set([
    'main', 'nsfw', 'jailbreak', 'dialogueExamples', 'chatHistory',
    'worldInfoAfter', 'worldInfoBefore', 'enhanceDefinitions',
    'charDescription', 'charPersonality', 'scenario', 'personaDescription',
]);

/**
 * 将编辑后的 MD 合并回原始 JSON
 */
export function mergeBack(mdContent: string, originalPreset: SillyTavernPreset): MergeResult {
    // 深拷贝原始 JSON
    const preset: SillyTavernPreset = JSON.parse(JSON.stringify(originalPreset));

    // 解析 MD 条目（不含 marker）
    const parsedEntries = parseMd(mdContent);

    const changes: ChangeEntry[] = [];

    // 构建原始 prompts 索引
    const originalPromptMap = new Map<string, PromptEntry>();
    for (const entry of preset.prompts) {
        originalPromptMap.set(entry.identifier, entry);
    }

    // 收集 MD 中出现的所有 ID
    const mdEntryIds = new Set<string>();

    // 处理每个 MD 条目
    for (const parsed of parsedEntries) {
        if (parsed.id && originalPromptMap.has(parsed.id)) {
            // 已存在条目 → 更新
            mdEntryIds.add(parsed.id);
            const original = originalPromptMap.get(parsed.id)!;
            const diffs: string[] = [];

            if (original.content?.trim() !== parsed.content.trim()) {
                diffs.push('内容');
            }
            if (original.name !== parsed.name) {
                diffs.push('名称');
            }
            if (original.role !== parsed.role) {
                diffs.push('角色');
            }
            if (original.injection_depth !== parsed.depth) {
                diffs.push('深度');
            }
            if (original.injection_position !== parsed.position) {
                diffs.push('位置');
            }

            if (original.forbid_overrides !== parsed.forbidOverrides) {
                diffs.push('禁止覆盖');
            }

            if (diffs.length > 0) {
                // 更新字段
                original.content = parsed.content;
                original.name = parsed.name;
                original.role = parsed.role;
                original.injection_depth = parsed.depth;
                original.injection_position = parsed.position;
                original.forbid_overrides = parsed.forbidOverrides;
                if (parsed.injectionTrigger.length > 0) {
                    original.injection_trigger = parsed.injectionTrigger;
                }
                if (parsed.order !== null) {
                    original.injection_order = parsed.order;
                }

                changes.push({
                    type: 'modified',
                    name: parsed.name,
                    id: parsed.id,
                    details: `修改了: ${diffs.join(', ')}`,
                });
            }
        } else {
            // 新增条目
            const newId = parsed.id && parsed.id !== 'new' ? parsed.id : generateUUID();
            mdEntryIds.add(newId);

            const newEntry: PromptEntry = {
                identifier: newId,
                name: parsed.name,
                system_prompt: false,
                enabled: false,  // enabled 由 prompt_order 控制
                marker: false,
                role: parsed.role,
                content: parsed.content,
                injection_position: parsed.position,
                injection_depth: parsed.depth,
                forbid_overrides: parsed.forbidOverrides,
                injection_order: parsed.order ?? 100,
                ...(parsed.injectionTrigger.length > 0 ? { injection_trigger: parsed.injectionTrigger } : {}),
            };

            preset.prompts.push(newEntry);

            changes.push({
                type: 'added',
                name: parsed.name,
                id: newId,
            });

            // 更新 parsed.id 以便排序使用
            parsed.id = newId;
        }
    }

    // 检查被删除的条目（原 JSON 有但 MD 中没有，且不是内置 marker）
    for (const [id, entry] of originalPromptMap) {
        if (!mdEntryIds.has(id) && !BUILTIN_MARKERS.has(id) && !entry.marker) {
            changes.push({
                type: 'removed',
                name: entry.name,
                id,
            });

            // 从 prompts 数组中移除
            const idx = preset.prompts.findIndex(p => p.identifier === id);
            if (idx !== -1) {
                preset.prompts.splice(idx, 1);
            }
        }
    }

    // 重建 prompt_order
    rebuildPromptOrder(preset, parsedEntries);

    return { preset, changes };
}

/**
 * 根据 MD 条目顺序重建 prompt_order
 */
function rebuildPromptOrder(preset: SillyTavernPreset, parsedEntries: ParsedEntry[]): void {
    const orderGroupIdx = preset.prompt_order.findIndex(
        g => g.character_id === TARGET_CHARACTER_ID
    );

    if (orderGroupIdx === -1) return;

    const orderGroup = preset.prompt_order[orderGroupIdx];
    if (!orderGroup) return;
    const oldOrder = orderGroup.order;

    // 构建 MD 中出现的 entry id 列表
    const mdOrderEntries: PromptOrderItem[] = parsedEntries
        .filter(e => e.id)
        .map(e => ({
            identifier: e.id!,
            enabled: e.enabled,
        }));

    // 收集需要保留的 marker 条目（在原 order 中存在但不在 MD 中）
    const mdIdSet = new Set(parsedEntries.map(e => e.id).filter(Boolean));
    const markerEntries = oldOrder.filter(
        item => BUILTIN_MARKERS.has(item.identifier) && !mdIdSet.has(item.identifier)
    );

    // 遍历原始顺序，构建位置索引
    const originalOrderMap = new Map(oldOrder.map((item, idx) => [item.identifier, idx]));

    // 收集 marker 的原始位置
    const markerPositions: { item: PromptOrderItem; originalIdx: number }[] = markerEntries.map(item => ({
        item,
        originalIdx: originalOrderMap.get(item.identifier) ?? 0,
    }));
    markerPositions.sort((a, b) => a.originalIdx - b.originalIdx);

    // 先放所有 MD 条目，然后将 marker 根据原始位置插入
    const result = [...mdOrderEntries];

    for (const mp of markerPositions) {
        // 找到原始顺序中，这个 marker 之前最近的一个非 marker 条目
        let insertAfter = -1;
        for (let i = mp.originalIdx - 1; i >= 0; i--) {
            const prevItem = oldOrder[i];
            if (!prevItem) continue;
            const foundIdx = result.findIndex(e => e.identifier === prevItem.identifier);
            if (foundIdx !== -1) {
                insertAfter = foundIdx;
                break;
            }
        }
        result.splice(insertAfter + 1, 0, mp.item);
    }

    orderGroup.order = result;
}

