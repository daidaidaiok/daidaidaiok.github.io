window.TIERS = [
  { id: 'SOTA', label: 'SOTA (State of the Art)', color: '#d4a017' },
  { id: 'tier1', label: '第一梯队', color: '#7c3aed' },
  { id: 'tier2', label: '第二梯队', color: '#2563eb' },
  { id: 'tier3', label: '第三梯队', color: '#6b7280' },
  { id: 'entry', label: '入门级', color: '#9ca3af' },
]

// 推理档位展示顺序（高→低）
window.REASONING_ORDER = ['max', 'xhigh', 'high', 'medium', 'low', 'minimal', 'none']

window.REASONING_LABEL = {
  max: 'Max 推理',
  xhigh: 'XHigh 推理',
  high: 'High 推理',
  medium: 'Medium 推理',
  low: 'Low 推理',
  minimal: 'Minimal 推理',
  none: '无推理',
}

window.REASONING_COLOR = {
  max: '#dc2626', // 红
  xhigh: '#ea580c', // 橙
  high: '#d4a017', // 金
  medium: '#2563eb', // 蓝
  low: '#6b7280', // 灰
  minimal: '#9ca3af', // 浅灰
  none: '#9ca3af', // 浅灰
}

// 已知开源模型 → 量化精度映射
window.QUANT_MAP = {
  'Qwen3.8 Max': 'fp16',
  'Qwen3.8 2.4T A95B': 'AWQ-INT4',
  'Qwen3.8 27B': 'AWQ-INT4',
  'Qwen3.7 Max': 'fp16',
  'Qwen3.7 Plus': 'AWQ-INT4',
  'Qwen3.7 Flash': 'GPTQ-INT4',
  'Qwen3.6 35B A3B': 'AWQ-INT4',
  'Qwen3.6 Plus': 'AWQ-INT4',
  'Kimi K3': 'fp16',
  'Kimi K2.7 Code': 'AWQ-INT4',
  'Kimi K2.6': 'AWQ-INT4',
  'DeepSeek V4 Pro 0813': 'fp16',
  'DeepSeek V4 Flash': 'AWQ-INT4',
  'DeepSeek V3.2': 'GPTQ-INT4',
  'DeepSeek V3.1 Terminus': 'fp16',
  'Llama 4 Maverick': 'fp16',
  'Llama 4 Scout': 'AWQ-INT4',
  'GPT-OSS 120B': 'fp16',
  'GPT-OSS 20B': 'AWQ-INT4',
  'Mistral Medium 3.5': 'fp16',
  'Mistral Medium 3.1': 'AWQ-INT4',
  'GLM 5.2': 'fp16',
  'GLM 5.1': 'AWQ-INT4',
  'Phi-4': 'fp16',
  'OLMo 3 32B Think': 'fp16',
}
