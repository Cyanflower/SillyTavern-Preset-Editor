import type { SillyTavernPreset, ParsedEntry } from '../types/preset';

const TARGET_CHARACTER_ID = 100001;

/**
 * 从 SillyTavern JSON 直接提取 ParsedEntry[]
 * 按 prompt_order 排序
 */
export function jsonToEntries(preset: SillyTavernPreset): ParsedEntry[] {
    const orderGroup = preset.prompt_order.find(g => g.character_id === TARGET_CHARACTER_ID);
    if (!orderGroup) {
        throw new Error(`找不到 character_id=${TARGET_CHARACTER_ID} 的排序配置`);
    }

    const promptMap = new Map<string, (typeof preset.prompts)[number]>();
    for (const entry of preset.prompts) {
        promptMap.set(entry.identifier, entry);
    }

    const entries: ParsedEntry[] = [];

    for (const orderItem of orderGroup.order) {
        const entry = promptMap.get(orderItem.identifier);
        if (!entry) continue;

        entries.push({
            name: entry.name,
            id: entry.identifier,
            role: entry.role,
            enabled: orderItem.enabled,
            depth: entry.injection_depth,
            position: entry.injection_position,
            order: entry.injection_order ?? null,
            systemPrompt: entry.system_prompt,
            marker: entry.marker ?? false,
            forbidOverrides: entry.forbid_overrides,
            injectionTrigger: entry.injection_trigger ?? [],
            content: entry.content ?? '',
        });
    }

    return entries;
}

/** 采样参数 diff */
export interface SamplingParamDiff {
    key: string;
    label: string;
    currentVal: unknown;
    incomingVal: unknown;
    decision: 'keep' | 'use-new';
}

/** 需要对比的采样参数列表 */
export const SAMPLING_KEYS: { key: string; label: string }[] = [
    { key: 'temperature', label: 'Temperature' },
    { key: 'frequency_penalty', label: 'Frequency Penalty' },
    { key: 'presence_penalty', label: 'Presence Penalty' },
    { key: 'top_p', label: 'Top P' },
    { key: 'top_k', label: 'Top K' },
    { key: 'top_a', label: 'Top A' },
    { key: 'min_p', label: 'Min P' },
    { key: 'repetition_penalty', label: 'Repetition Penalty' },
    { key: 'openai_max_context', label: 'Max Context' },
    { key: 'openai_max_tokens', label: 'Max Tokens' },
    { key: 'seed', label: 'Seed' },
    { key: 'reasoning_effort', label: 'Reasoning Effort' },
];

/**
 * 对比两个 preset 的采样参数，返回有差异的项
 */
export function diffSamplingParams(
    current: SillyTavernPreset,
    incoming: SillyTavernPreset
): SamplingParamDiff[] {
    const diffs: SamplingParamDiff[] = [];

    for (const { key, label } of SAMPLING_KEYS) {
        const curVal = (current as Record<string, unknown>)[key];
        const incVal = (incoming as Record<string, unknown>)[key];

        if (JSON.stringify(curVal) !== JSON.stringify(incVal)) {
            diffs.push({
                key,
                label,
                currentVal: curVal,
                incomingVal: incVal,
                decision: 'keep',
            });
        }
    }

    return diffs;
}

/**
 * 将采样参数 diffs 应用到 preset
 */
export function applySamplingParams(
    preset: SillyTavernPreset,
    diffs: SamplingParamDiff[]
): SillyTavernPreset {
    const result = { ...preset };

    for (const diff of diffs) {
        if (diff.decision === 'use-new') {
            (result as Record<string, unknown>)[diff.key] = diff.incomingVal;
        }
    }

    return result;
}
