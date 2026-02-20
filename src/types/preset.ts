/**
 * SillyTavern Completion Preset JSON 类型定义
 */

/** 单个提示词条目 */
export interface PromptEntry {
    /** 条目标识符：UUID 或内置标识符 (main, chatHistory, etc.) */
    identifier: string;
    /** 条目显示名称 */
    name: string;
    /** 角色 */
    role: 'system' | 'user' | 'assistant';
    /** 提示词内容 */
    content: string;
    /** 是否为系统提示词（内置条目） */
    system_prompt: boolean;
    /** 是否为占位标记（如 chatHistory, worldInfoBefore） */
    marker?: boolean;
    /** 是否启用 */
    enabled?: boolean;
    /** 注入位置：0=相对位置, 1=绝对位置 */
    injection_position: number;
    /** 注入深度 */
    injection_depth: number;
    /** 是否禁止覆盖 */
    forbid_overrides: boolean;
    /** 注入排序优先级 */
    injection_order?: number;
    /** 触发条件 */
    injection_trigger?: string[];
}

/** prompt_order 中的单个排序项 */
export interface PromptOrderItem {
    identifier: string;
    enabled: boolean;
}

/** 按 character_id 分组的排序配置 */
export interface PromptOrderGroup {
    character_id: number;
    order: PromptOrderItem[];
}

/** SillyTavern Completion Preset 顶层结构 */
export interface SillyTavernPreset {
    // 采样参数
    temperature: number;
    frequency_penalty: number;
    presence_penalty: number;
    top_p: number;
    top_k: number;
    top_a: number;
    min_p: number;
    repetition_penalty: number;
    max_context_unlocked: boolean;
    openai_max_context: number;
    openai_max_tokens: number;

    // 内置提示词
    names_behavior: number;
    send_if_empty: string;
    impersonation_prompt: string;
    new_chat_prompt: string;
    new_group_chat_prompt: string;
    new_example_chat_prompt: string;
    continue_nudge_prompt: string;
    bias_preset_selected: string;
    wi_format: string;
    scenario_format: string;
    personality_format: string;
    group_nudge_prompt: string;
    stream_openai: boolean;

    // 核心数据
    prompts: PromptEntry[];
    prompt_order: PromptOrderGroup[];

    // 其他设置
    assistant_prefill: string;
    assistant_impersonation: string;
    use_sysprompt: boolean;
    squash_system_messages: boolean;
    media_inlining: boolean;
    inline_image_quality: string;
    continue_prefill: boolean;
    continue_postfix: string;
    function_calling: boolean;
    show_thoughts: boolean;
    reasoning_effort: string;
    verbosity: string;
    enable_web_search: boolean;
    seed: number;
    n: number;
    request_images: boolean;
    request_image_aspect_ratio: string;
    request_image_resolution: string;
    extensions: Record<string, unknown>;

    // 允许额外字段
    [key: string]: unknown;
}

/** 从 MD 解析出的条目结构 */
export interface ParsedEntry {
    /** 条目名称 (from H2 heading) */
    name: string;
    /** 条目 ID (from metadata comment) */
    id: string | null;
    /** 角色 */
    role: 'system' | 'user' | 'assistant';
    /** 是否启用 */
    enabled: boolean;
    /** 注入深度 */
    depth: number;
    /** 注入位置 */
    position: number;
    /** 注入排序 */
    order: number | null;
    /** 是否为系统提示词 */
    systemPrompt: boolean;
    /** 是否为 marker */
    marker: boolean;
    /** 是否禁止覆盖 */
    forbidOverrides: boolean;
    /** 触发条件 */
    injectionTrigger: string[];
    /** 提示词内容 */
    content: string;
}
