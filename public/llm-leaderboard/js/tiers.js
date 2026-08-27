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
