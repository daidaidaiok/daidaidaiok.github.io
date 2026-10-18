// 模型斩杀线：发布时间 × AA 指数散点 + 可见前沿阶梯线 + 斩杀线（前沿 × 70%）。
// 无依赖、纯 SVG 渲染（站点零依赖约定，且 CSP 限制外部脚本）。
;(function () {
  'use strict'

  // SVG 画布逻辑尺寸
  const W = 1000
  const H = 520
  const M = { top: 24, right: 130, bottom: 40, left: 48 }

  // 时间轴范围（略宽于数据集首尾，给标签留白）
  const X_MIN = new Date('2024-11-01').getTime()
  const X_MAX = new Date('2026-11-15').getTime()
  const Y_MAX = 65

  const COLOR = {
    closed: '#1d4ed8',
    open: '#047857',
    dead: '#9ca3af',
    frontier: '#374151',
    kill: '#dc2626',
    grid: '#e5e7eb',
    text: '#6b7280',
  }

  const escapeHTML = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[c]
    )

  // 月级精度按当月 15 日定位
  function releaseTime(m) {
    const iso = m.date_precision === 'month' ? m.released + '-15' : m.released
    return new Date(iso).getTime()
  }

  function xScale(t) {
    return M.left + ((t - X_MIN) / (X_MAX - X_MIN)) * (W - M.left - M.right)
  }
  function yScale(v) {
    return H - M.bottom - (v / Y_MAX) * (H - M.top - M.bottom)
  }

  // 发布时间排序（同时同分的点做少量水平抖动，避免完全重叠）
  function prepare(models) {
    const sorted = [...models].sort((a, b) => releaseTime(a) - releaseTime(b))
    const seen = {}
    for (const m of sorted) {
      const key = String(releaseTime(m))
      const n = seen[key] || 0
      seen[key] = n + 1
      m._jitter = n === 0 ? 0 : ((n % 3) - 1) * 3.5 // -3.5 / 0 / +3.5 天
    }
    return sorted
  }

  // 可见前沿：按发布顺序的 running max，返回阶梯转折点序列
  function frontierSteps(sorted) {
    const steps = []
    let best = -1
    for (const m of sorted) {
      if (m.aa_index > best) {
        best = m.aa_index
        steps.push({ t: releaseTime(m) + m._jitter * 86400000, v: m.aa_index, model: m })
      }
    }
    return steps
  }

  // 阶梯路径：每点先水平推进到下一前沿的日期，再垂直抬升
  function stepPath(steps, xEnd) {
    if (steps.length === 0) return ''
    let d = `M ${xScale(steps[0].t)} ${yScale(steps[0].v)}`
    for (let i = 1; i < steps.length; i++) {
      d += ` H ${xScale(steps[i].t)} V ${yScale(steps[i].v)}`
    }
    d += ` H ${xScale(xEnd)}`
    return d
  }

  function fmtDate(m) {
    return m.date_precision === 'month'
      ? m.released + '（月级精度' + (m.date_estimated ? '，推断' : '') + '）'
      : m.released
  }

  function render(data) {
    const models = prepare(data.models)
    const leader = data.leader_aa_index
    const kill = leader * data.kill_line_ratio
    const dead = models.filter((m) => m.aa_index < kill)
    const steps = frontierSteps(models)

    // ---- 头部统计 ----
    document.getElementById('stat-leader').textContent = leader
    document.getElementById('stat-kill').textContent = kill.toFixed(1)
    document.getElementById('stat-count').textContent = models.length
    document.getElementById('stat-dead').textContent = dead.length
    document.getElementById('index-version').textContent = data.aa_index_version
    document.getElementById('stat-updated').textContent = String(data.updated_at).slice(0, 10)

    const notes = document.getElementById('kill-notes-list')
    notes.innerHTML = (data.notes || []).map((n) => `<li>${escapeHTML(n)}</li>`).join('')

    // ---- SVG ----
    const parts = []

    // y 网格与刻度
    for (let v = 0; v <= Y_MAX; v += 10) {
      const y = yScale(v)
      parts.push(
        `<line x1="${M.left}" y1="${y}" x2="${W - M.right}" y2="${y}" stroke="${COLOR.grid}" stroke-width="1"/>`,
        `<text x="${M.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="${COLOR.text}">${v}</text>`
      )
    }
    // x 轴季度刻度
    const quarter = new Date(X_MIN)
    quarter.setMonth(Math.ceil(quarter.getMonth() / 3) * 3)
    for (
      let t = quarter.getTime();
      t <= X_MAX;
      t = new Date(t).setMonth(new Date(t).getMonth() + 3)
    ) {
      const x = xScale(t)
      const d = new Date(t)
      parts.push(
        `<text x="${x}" y="${H - M.bottom + 20}" text-anchor="middle" font-size="11" fill="${COLOR.text}">${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}</text>`
      )
    }

    // 今日斩杀线（水平延伸到右缘）+ 榜首参考线
    parts.push(
      `<line x1="${M.left}" y1="${yScale(kill)}" x2="${W - M.right}" y2="${yScale(kill)}" stroke="${COLOR.kill}" stroke-width="1.5" stroke-dasharray="6 4" opacity="0.9"/>`,
      `<text x="${W - M.right + 6}" y="${yScale(kill) + 4}" font-size="11" fill="${COLOR.kill}" font-weight="600">斩杀线 ${kill.toFixed(1)}</text>`,
      `<line x1="${M.left}" y1="${yScale(leader)}" x2="${W - M.right}" y2="${yScale(leader)}" stroke="#d4a017" stroke-width="1" stroke-dasharray="2 4" opacity="0.7"/>`,
      `<text x="${W - M.right + 6}" y="${yScale(leader) + 4}" font-size="11" fill="#b45309" font-weight="600">榜首 ${leader}</text>`
    )

    // 可见前沿阶梯线 + 斩杀线阶梯线（前沿 × 70%）
    const xEnd = X_MAX
    const killSteps = steps.map((s) => ({ ...s, v: s.v * data.kill_line_ratio }))
    parts.push(
      `<path d="${stepPath(steps, xEnd)}" fill="none" stroke="${COLOR.frontier}" stroke-width="2" opacity="0.85"/>`,
      `<path d="${stepPath(killSteps, xEnd)}" fill="none" stroke="${COLOR.kill}" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.55"/>`
    )

    // 前沿点标签（交替上下避让；密集区用 LABEL_NUDGE 手工偏移）
    const LABEL_NUDGE = {
      // 2026-09 密集簇：默认交替位置相互重叠，逐个手工偏移
      'GLM-5.3': { dx: -8, dy: -12, anchor: 'end' },
      'Muse Spark 1.3': { dx: 12, dy: 4, anchor: 'start' },
      'Claude Fable 5.1': { dx: -10, dy: 4, anchor: 'end' },
      'Claude Opus 5.5': { dx: -10, dy: -10, anchor: 'end' },
    }
    steps.forEach((s, i) => {
      const above = i % 2 === 0
      const nudge = LABEL_NUDGE[s.model.name] || {}
      const dx = nudge.dx ?? 0
      const dy = nudge.dy ?? (above ? -10 : 16)
      const anchor = nudge.anchor || 'middle'
      parts.push(
        `<text x="${xScale(s.t) + dx}" y="${yScale(s.v) + dy}" text-anchor="${anchor}" font-size="11" fill="${COLOR.frontier}" font-weight="600">${escapeHTML(s.model.name)}</text>`
      )
    })

    // 数据点
    const dots = []
    for (const m of models) {
      const t = releaseTime(m) + m._jitter * 86400000
      const x = xScale(t)
      const y = yScale(m.aa_index)
      const isDead = m.aa_index < kill
      const fill = isDead ? COLOR.dead : m.open_source ? COLOR.open : COLOR.closed
      const stroke = m.score_estimated ? '#fff' : 'none'
      const dash = m.score_estimated
        ? `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${isDead ? COLOR.dead : fill}" stroke-width="1.5" stroke-dasharray="2 2"/>`
        : ''
      dots.push(
        `<circle cx="${x}" cy="${y}" r="6" fill="${fill}" stroke="${stroke}" stroke-width="1.5" opacity="${isDead ? 0.55 : 0.95}" data-idx="${models.indexOf(m)}" class="kill-dot"/>${dash}`
      )
    }
    parts.push(...dots)

    document.getElementById('kill-chart').innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="模型斩杀线时间线图" style="width:100%;height:auto;min-width:720px;font-family:inherit">${parts.join('')}</svg>` +
      `<div id="kill-tooltip" class="kill-tooltip" hidden></div>`

    bindTooltip(models, kill)
  }

  function bindTooltip(models, kill) {
    const tip = document.getElementById('kill-tooltip')
    const chart = document.getElementById('kill-chart')
    chart.addEventListener('mousemove', (e) => {
      const dot = e.target.closest('.kill-dot')
      if (!dot) {
        tip.hidden = true
        return
      }
      const m = models[Number(dot.dataset.idx)]
      const status =
        m.aa_index >= kill
          ? `<span style="color:#047857;font-weight:600">幸存（≥ 斩杀线）</span>`
          : `<span style="color:#b91c1c;font-weight:600">☠ 已坠线</span>`
      tip.innerHTML =
        `<strong>${escapeHTML(m.name)}</strong>&emsp;${escapeHTML(m.provider)}<br>` +
        `发布：${escapeHTML(fmtDate(m))}<br>` +
        `AA 指数：${m.aa_index}${m.score_estimated ? '（估算）' : ''}<br>` +
        status
      tip.hidden = false
      const rect = chart.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      tip.style.left = Math.min(x + 14, rect.width - 230) + 'px'
      tip.style.top = Math.max(y - 10, 4) + 'px'
    })
    chart.addEventListener('mouseleave', () => {
      tip.hidden = true
    })
  }

  async function init() {
    try {
      const resp = await fetch('data/killline.json', { cache: 'no-store' })
      const data = await resp.json()
      render(data)
    } catch (err) {
      document.getElementById('kill-chart').innerHTML =
        '<p class="error">数据加载失败。请检查 data/killline.json 是否存在。</p>'
      console.error(err)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
