import type { SillyTavernPreset, PromptEntry } from '../types/preset';

const TARGET_CHARACTER_ID = 100001;

/**
 * 将 SillyTavern Preset JSON 转换为 Markdown 格式
 */
export function jsonToMd(preset: SillyTavernPreset, sourceFilename?: string): string {
    const lines: string[] = [];

    // 文件头部元信息
    lines.push(`<!-- preset-converter-version: 1.0 -->`);
    if (sourceFilename) {
        lines.push(`<!-- source: ${sourceFilename} -->`);
    }
    lines.push(`<!-- prompt_order_character_id: ${TARGET_CHARACTER_ID} -->`);
    lines.push('');

    // 获取排序配置
    const orderGroup = preset.prompt_order.find(g => g.character_id === TARGET_CHARACTER_ID);
    if (!orderGroup) {
        throw new Error(`找不到 character_id=${TARGET_CHARACTER_ID} 的排序配置`);
    }

    // 构建 prompts 查找表
    const promptMap = new Map<string, PromptEntry>();
    for (const entry of preset.prompts) {
        promptMap.set(entry.identifier, entry);
    }

    // 按排序顺序输出每个条目
    for (const orderItem of orderGroup.order) {
        const entry = promptMap.get(orderItem.identifier);
        if (!entry) {
            // 排序列表里有但 prompts 里没有的标识符，跳过
            continue;
        }

        lines.push('---');
        lines.push('');

        // 条目标题
        const markerSuffix = entry.marker ? ' [MARKER]' : '';
        lines.push(`## ${entry.name}${markerSuffix}`);

        // 元数据注释
        const metaParts: string[] = [];
        metaParts.push(`id: ${entry.identifier}`);

        if (entry.marker) {
            metaParts.push('marker: true');
            metaParts.push(`enabled: ${orderItem.enabled}`);

            // Non-chatHistory markers support role/position/depth/order
            if (entry.identifier !== 'chatHistory' && entry.identifier !== 'dialogueExamples') {
                metaParts.push(`role: ${entry.role}`);
                metaParts.push(`depth: ${entry.injection_depth}`);

                if (entry.injection_position !== 0) {
                    metaParts.push(`position: ${entry.injection_position}`);
                }
                if (entry.injection_order !== undefined && entry.injection_order !== 100) {
                    metaParts.push(`order: ${entry.injection_order}`);
                }
            }
        } else {
            metaParts.push(`role: ${entry.role}`);
            metaParts.push(`enabled: ${orderItem.enabled}`);
            metaParts.push(`depth: ${entry.injection_depth}`);

            if (entry.injection_position !== 0) {
                metaParts.push(`position: ${entry.injection_position}`);
            }
            if (entry.injection_order !== undefined && entry.injection_order !== 100) {
                metaParts.push(`order: ${entry.injection_order}`);
            }
            if (entry.system_prompt) {
                metaParts.push('system_prompt: true');
            }
            if (entry.forbid_overrides) {
                metaParts.push('forbid_overrides: true');
            }
            if (entry.injection_trigger && entry.injection_trigger.length > 0) {
                metaParts.push(`trigger: ${entry.injection_trigger.join(',')}`);
            }
        }

        lines.push(`<!-- ${metaParts.join(' | ')} -->`);
        lines.push('');

        // 内容区
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
