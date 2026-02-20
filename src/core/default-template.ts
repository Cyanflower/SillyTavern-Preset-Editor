import type { SillyTavernPreset } from '../types/preset';

/**
 * 创建一个基于 SillyTavern 默认预设的空白 preset
 * 采样参数默认值来自 Default.json
 */
export function createDefaultPreset(): SillyTavernPreset {
    return {
        // 采样参数
        temperature: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        top_p: 1,
        top_k: 0,
        top_a: 0,
        min_p: 0,
        repetition_penalty: 1,
        openai_max_context: 4095,
        openai_max_tokens: 300,
        seed: -1,

        // Prompts 列表（含所有标准 markers 和内置条目）
        prompts: [
            {
                name: 'Main Prompt',
                system_prompt: true,
                role: 'system',
                content: '',
                identifier: 'main',
            },
            {
                name: 'Auxiliary Prompt',
                system_prompt: true,
                role: 'system',
                content: '',
                identifier: 'nsfw',
            },
            {
                identifier: 'dialogueExamples',
                name: 'Chat Examples',
                system_prompt: true,
                marker: true,
            },
            {
                name: 'Post-History Instructions',
                system_prompt: true,
                role: 'system',
                content: '',
                identifier: 'jailbreak',
            },
            {
                identifier: 'chatHistory',
                name: 'Chat History',
                system_prompt: true,
                marker: true,
            },
            {
                identifier: 'worldInfoAfter',
                name: 'World Info (after)',
                system_prompt: true,
                marker: true,
            },
            {
                identifier: 'worldInfoBefore',
                name: 'World Info (before)',
                system_prompt: true,
                marker: true,
            },
            {
                identifier: 'enhanceDefinitions',
                role: 'system',
                name: 'Enhance Definitions',
                content: '',
                system_prompt: true,
                marker: false,
            },
            {
                identifier: 'charDescription',
                name: 'Char Description',
                system_prompt: true,
                marker: true,
            },
            {
                identifier: 'charPersonality',
                name: 'Char Personality',
                system_prompt: true,
                marker: true,
            },
            {
                identifier: 'scenario',
                name: 'Scenario',
                system_prompt: true,
                marker: true,
            },
            {
                identifier: 'personaDescription',
                name: 'Persona Description',
                system_prompt: true,
                marker: true,
            },
        ],

        // 排序（character_id 100000 和 100001，顺序与 Default.json 一致）
        prompt_order: [
            {
                character_id: 100000,
                order: [
                    { identifier: 'main', enabled: true },
                    { identifier: 'worldInfoBefore', enabled: true },
                    { identifier: 'charDescription', enabled: true },
                    { identifier: 'charPersonality', enabled: true },
                    { identifier: 'scenario', enabled: true },
                    { identifier: 'enhanceDefinitions', enabled: false },
                    { identifier: 'nsfw', enabled: true },
                    { identifier: 'worldInfoAfter', enabled: true },
                    { identifier: 'dialogueExamples', enabled: true },
                    { identifier: 'chatHistory', enabled: true },
                    { identifier: 'jailbreak', enabled: true },
                ],
            },
            {
                character_id: 100001,
                order: [
                    { identifier: 'main', enabled: true },
                    { identifier: 'worldInfoBefore', enabled: true },
                    { identifier: 'personaDescription', enabled: true },
                    { identifier: 'charDescription', enabled: true },
                    { identifier: 'charPersonality', enabled: true },
                    { identifier: 'scenario', enabled: true },
                    { identifier: 'enhanceDefinitions', enabled: false },
                    { identifier: 'nsfw', enabled: true },
                    { identifier: 'worldInfoAfter', enabled: true },
                    { identifier: 'dialogueExamples', enabled: true },
                    { identifier: 'chatHistory', enabled: true },
                    { identifier: 'jailbreak', enabled: true },
                ],
            },
        ],
    };
}
