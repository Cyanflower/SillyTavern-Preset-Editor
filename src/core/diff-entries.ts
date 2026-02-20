import type { ParsedEntry } from '../types/preset';

/** 单个字段变更 */
export interface MetaChange {
    field: string;
    oldVal: string;
    newVal: string;
}

/** 单个条目的 diff 结果 */
export interface EntryDiff {
    type: 'modified' | 'added' | 'removed';
    /** modified: 元数据变更列表 */
    metaChanges?: MetaChange[];
    /** modified: 内容是否变更 */
    contentChanged?: boolean;
    /** modified: 旧内容摘要 */
    oldContent?: string;
    /** modified: 新内容摘要 */
    newContent?: string;
}

/** 合并列表中的单个条目 */
export interface MergeItem {
    /** 条目类型 */
    type: 'unchanged' | 'modified' | 'added' | 'removed';
    /** 当前版本的条目 (unchanged/modified/removed) */
    currentEntry?: ParsedEntry;
    /** 导入版本的条目 (unchanged/modified/added) */
    incomingEntry?: ParsedEntry;
    /** 用于显示的名称 */
    name: string;
    /** 用于匹配的 id */
    id: string | null;
    /** diff 详情 */
    diff?: EntryDiff;
    /**
     * 用户决策:
     * - unchanged: 无需决策
     * - modified: 'keep' | 'use-new'
     * - added: 'include' | 'skip'
     * - removed: 'remove' | 'keep'
     */
    decision: 'keep' | 'use-new' | 'include' | 'skip' | 'remove';
}

const PREVIEW_CHARS = 200;

/**
 * 构建完整的合并列表
 * 以 incoming 的顺序为基础，包含所有条目（unchanged + modified + added）
 * removed 条目排在最后
 */
export function buildMergeList(current: ParsedEntry[], incoming: ParsedEntry[]): MergeItem[] {
    const items: MergeItem[] = [];

    // 当前条目索引
    const currentMap = new Map<string, ParsedEntry>();
    for (const e of current) {
        if (e.id) currentMap.set(e.id, e);
    }

    const matched = new Set<string>();

    // 按 incoming 顺序构建
    for (const inc of incoming) {
        if (!inc.id || !currentMap.has(inc.id)) {
            // 新增
            items.push({
                type: 'added',
                incomingEntry: inc,
                name: inc.name,
                id: inc.id,
                decision: 'include',
            });
            continue;
        }

        matched.add(inc.id);
        const cur = currentMap.get(inc.id)!;

        // 比较
        const metaChanges = compareMetadata(cur, inc);
        const contentChanged = cur.content !== inc.content;

        if (metaChanges.length > 0 || contentChanged) {
            items.push({
                type: 'modified',
                currentEntry: cur,
                incomingEntry: inc,
                name: inc.name,
                id: inc.id,
                diff: {
                    type: 'modified',
                    metaChanges,
                    contentChanged,
                    oldContent: contentChanged ? cur.content.slice(0, PREVIEW_CHARS) : undefined,
                    newContent: contentChanged ? inc.content.slice(0, PREVIEW_CHARS) : undefined,
                },
                decision: 'use-new',
            });
        } else {
            // 无变更
            items.push({
                type: 'unchanged',
                currentEntry: cur,
                incomingEntry: inc,
                name: cur.name,
                id: cur.id,
                decision: 'keep',
            });
        }
    }

    // removed: 在 current 中有但 incoming 中没有的（排除 marker）
    for (const cur of current) {
        if (cur.id && !matched.has(cur.id) && !cur.marker) {
            items.push({
                type: 'removed',
                currentEntry: cur,
                name: cur.name,
                id: cur.id,
                diff: { type: 'removed' },
                decision: 'remove',
            });
        }
    }

    return items;
}

function compareMetadata(cur: ParsedEntry, inc: ParsedEntry): MetaChange[] {
    const changes: MetaChange[] = [];

    if (cur.name !== inc.name) {
        changes.push({ field: '名称', oldVal: cur.name, newVal: inc.name });
    }
    if (cur.role !== inc.role) {
        changes.push({ field: 'role', oldVal: cur.role, newVal: inc.role });
    }
    if (cur.enabled !== inc.enabled) {
        changes.push({ field: 'enabled', oldVal: String(cur.enabled), newVal: String(inc.enabled) });
    }
    if (cur.depth !== inc.depth) {
        changes.push({ field: 'depth', oldVal: String(cur.depth), newVal: String(inc.depth) });
    }
    if (cur.position !== inc.position) {
        changes.push({ field: 'position', oldVal: String(cur.position), newVal: String(inc.position) });
    }
    const curOrder = cur.order ?? 100;
    const incOrder = inc.order ?? 100;
    if (curOrder !== incOrder) {
        changes.push({ field: 'order', oldVal: String(curOrder), newVal: String(incOrder) });
    }
    if (cur.systemPrompt !== inc.systemPrompt) {
        changes.push({ field: 'system_prompt', oldVal: String(cur.systemPrompt), newVal: String(inc.systemPrompt) });
    }
    if (cur.forbidOverrides !== inc.forbidOverrides) {
        changes.push({ field: 'forbid_overrides', oldVal: String(cur.forbidOverrides), newVal: String(inc.forbidOverrides) });
    }

    return changes;
}

/**
 * 从 MergeItem[] 构建最终的 ParsedEntry[]
 */
export function applyMergeList(items: MergeItem[]): ParsedEntry[] {
    const result: ParsedEntry[] = [];

    for (const item of items) {
        switch (item.type) {
            case 'unchanged':
                result.push(item.currentEntry!);
                break;

            case 'modified':
                if (item.decision === 'use-new') {
                    result.push(item.incomingEntry!);
                } else {
                    result.push(item.currentEntry!);
                }
                break;

            case 'added':
                if (item.decision === 'include') {
                    result.push(item.incomingEntry!);
                }
                break;

            case 'removed':
                if (item.decision === 'keep') {
                    result.push(item.currentEntry!);
                }
                // decision === 'remove' → 不放入结果
                break;
        }
    }

    return result;
}
