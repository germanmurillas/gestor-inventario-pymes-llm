<?php

return [
    'opencode' => [
        'label'    => 'OpenCode',
        'base_url' => 'https://opencode.ai/zen/go/v1/chat/completions',
        'enabled'  => true,
        'models'   => ['deepseek-v4.1-flash', 'deepseek-v4-pro', 'deepseek-v4-flash', 'glm-5.3-flash', 'glm-5.1', 'kimi-k3', 'kimi-k2.6', 'qwen3.7-plus', 'minimax-m3', 'hy3-preview'],
    ],
    'ollama' => [
        'label'    => 'Ollama (local)',
        'base_url' => 'http://localhost:11434/v1/chat/completions',
        'enabled'  => true,
        'models'   => [],
    ],
    'openai' => [
        'label'    => 'OpenAI',
        'base_url' => 'https://api.openai.com/v1/chat/completions',
        'enabled'  => true,
        'models'   => ['gpt-4o-mini', 'gpt-3.5-turbo'],
    ],
    'anthropic' => [
        'label'    => 'Anthropic',
        'base_url' => 'https://api.anthropic.com/v1/messages',
        'enabled'  => false,
        'models'   => ['claude-3-5-haiku', 'claude-3-opus'],
    ],
    'google' => [
        'label'    => 'Google AI',
        'base_url' => 'https://generativelanguage.googleapis.com/v1beta',
        'enabled'  => false,
        'models'   => ['gemini-1.5-flash', 'gemini-1.5-pro'],
    ],
];
