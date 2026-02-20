import type { ParsedEntry } from '../types/preset';

/**
 * 解析 Markdown 文件为结构化条目列表
 * 跳过 [MARKER] 条目
 */
export function parseMd(mdContent: string): ParsedEntry[] {
    const entries: ParsedEntry[] = [];

    // 按 ## 标题分割为条目块
    // 匹配以 ## 开头的行作为分割点
    const blocks = splitIntoBlocks(mdContent);

    for (const block of blocks) {
        const parsed = parseBlock(block);
        if (parsed && !parsed.marker) {
            entries.push(parsed);
        }
    }

    return entries;
}

/**
 * 解析 Markdown 文件为结构化条目列表（包含 MARKER）
 */
export function parseMdWithMarkers(mdContent: string): ParsedEntry[] {
    const entries: ParsedEntry[] = [];
    const blocks = splitIntoBlocks(mdContent);

    for (const block of blocks) {
        const parsed = parseBlock(block);
        if (parsed) {
            entries.push(parsed);
        }
    }

    return entries;
}

/**
 * 将 MD 内容按 ## 标题分割为独立块
 */
function splitIntoBlocks(mdContent: string): string[] {
    const blocks: string[] = [];
    const lines = mdContent.split('\n');

    let currentBlock: string[] = [];
    let inBlock = false;
    let inContent = false; // 追踪是否在 <entry-content> 内部

    for (const line of lines) {
        const trimmed = line.trim();

        // 追踪 entry-content 标签状态
        if (trimmed === '<entry-content>') {
            inContent = true;
        } else if (trimmed === '</entry-content>') {
            inContent = false;
        }

        // 只在 entry-content 外部才按 ## 分割
        if (line.startsWith('## ') && !inContent) {
            // 遇到新的 H2 标题，保存上一个块
            if (inBlock && currentBlock.length > 0) {
                blocks.push(currentBlock.join('\n'));
            }
            currentBlock = [line];
            inBlock = true;
        } else if (inBlock) {
            currentBlock.push(line);
        }
    }

    // 保存最后一个块
    if (inBlock && currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n'));
    }

    return blocks;
}

/**
 * 解析单个条目块
 */
function parseBlock(block: string): ParsedEntry | null {
    const lines = block.split('\n');

    // 第一行必须是 ## 标题
    const titleLine = lines[0];
    if (!titleLine?.startsWith('## ')) {
        return null;
    }

    // 解析标题
    let name = titleLine.slice(3).trim();
    const isMarker = name.endsWith('[MARKER]');
    if (isMarker) {
        name = name.slice(0, -'[MARKER]'.length).trim();
    }

    // 解析元数据注释
    const metadata = parseMetadata(block);

    // 解析内容
    const content = parseContent(block);

    return {
        name,
        id: metadata.id || null,
        role: (metadata.role as 'system' | 'user' | 'assistant') || 'user',
        enabled: metadata.enabled !== 'false',
        depth: parseInt(metadata.depth || '4', 10),
        position: parseInt(metadata.position || '0', 10),
        order: metadata.order ? parseInt(metadata.order, 10) : null,
        systemPrompt: metadata.system_prompt === 'true',
        marker: isMarker || metadata.marker === 'true',
        forbidOverrides: metadata.forbid_overrides === 'true',
        injectionTrigger: metadata.trigger ? metadata.trigger.split(',').map(s => s.trim()).filter(Boolean) : [],
        content,
    };
}

/**
 * 从块中提取 HTML 注释中的元数据
 * 格式: <!-- key: value | key: value | ... -->
 */
function parseMetadata(block: string): Record<string, string> {
    const result: Record<string, string> = {};

    // 查找 <!-- ... --> 模式
    const commentMatch = block.match(/<!--\s*(.*?)\s*-->/s);
    if (!commentMatch) return result;

    const metaStr = commentMatch[1] ?? '';

    // 按 | 分割键值对
    const pairs = metaStr.split('|').map(s => s.trim());
    for (const pair of pairs) {
        const colonIdx = pair.indexOf(':');
        if (colonIdx === -1) continue;
        const key = pair.slice(0, colonIdx).trim();
        const value = pair.slice(colonIdx + 1).trim();
        result[key] = value;
    }

    return result;
}

/**
 * 从块中提取 <entry-content> 和 </entry-content> 之间的内容
 */
function parseContent(block: string): string {
    const startTag = '<entry-content>';
    const endTag = '</entry-content>';

    const startIdx = block.indexOf(startTag);
    const endIdx = block.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
        return '';
    }

    // 只去掉 <entry-content>\n 和 \n</entry-content> 各自引入的单个换行
    // 保留内容本身首尾的空行（酒馆拼接时需要）
    const raw = block.slice(startIdx + startTag.length, endIdx);
    return raw.replace(/^\n/, '').replace(/\n$/, '');
}
