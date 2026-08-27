;(function () {
  'use strict'

  const $ = (sel) => document.querySelector(sel)
  const $$ = (sel) => Array.from(document.querySelectorAll(sel))

  let allModels = []
  let currentFilter = 'all'
  let currentQuery = ''
  // 展开状态：key = `${tier}:${reasoning_effort}` -> bool
  const expandedRows = new Set()

  function isOpenSource(model) {
    if (typeof model.open_source === 'boolean') return model.open_source
    if (window.QUANT_MAP[model.name]) return true
    const openPrefixes = [
      'meta-llama/',
      'qwen/',
      'deepseek-ai/',
      'deepseek/',
      'mistralai/',
      'microsoft/',
      '01-ai/',
      'moonshotai/',
      'allenai/',
      'openai/gpt-oss',
    ]
    return openPrefixes.some((p) => (model.raw_id || '').startsWith(p))
  }

  function formatCtx(tokens) {
    if (!tokens) return '—'
    if (tokens >= 1000000) {
      // 1M+ 显示为 M（保留 1 位小数，如 1.0M, 1.3M）
      return (tokens / 1000000).toFixed(tokens % 1000000 === 0 ? 0 : 1) + 'M'
    }
    return Math.round(tokens / 1000) + 'K'
  }

  function badgeFor(model) {
    if (isOpenSource(model)) {
      const q = window.QUANT_MAP[model.name] || 'fp16'
      return { type: 'open', text: q }
    }
    const ctx = formatCtx(model.context_length)
    return { type: 'closed', text: ctx + ' ctx' }
  }

  function effortOf(model) {
    return model.reasoning_effort || 'none'
  }

  function passesFilter(model) {
    if (currentFilter === 'open' && !isOpenSource(model)) return false
    if (currentFilter === 'closed' && isOpenSource(model)) return false
    if (currentQuery) {
      const q = currentQuery.toLowerCase()
      const hay = (
        model.name +
        ' ' +
        model.provider +
        ' ' +
        (model.model_family || '')
      ).toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  }

  function escapeHTML(s) {
    return String(s).replace(
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
  }

  function cardHTML(model, opts = {}) {
    const badge = badgeFor(model)
    const effort = effortOf(model)
    const effortLabel = window.REASONING_LABEL[effort] || effort
    const effortColor = window.REASONING_COLOR[effort] || '#6b7280'
    const effortBadge =
      effort !== 'none'
        ? `<span class="effort-badge" style="background:${effortColor}15;color:${effortColor};border-color:${effortColor}40">${escapeHTML(effortLabel)}</span>`
        : ''
    return `
      <article class="card${opts.compact ? ' card-compact' : ''}" data-tier="${model.tier}" data-effort="${effort}">
        <div class="card-top">
          <h3 class="card-name">${escapeHTML(model.name)}</h3>
          <p class="card-provider">${escapeHTML(model.provider)}</p>
        </div>
        <div class="card-meta">
          <div class="card-badges">
            <span class="badge badge-${badge.type}">${escapeHTML(badge.text)}</span>
            ${effortBadge}
          </div>
          <span class="score">${model.score.toFixed(0)}</span>
        </div>
      </article>
    `
  }

  // 按 tier 分组（每组内按分数排序）
  function groupByTier(models) {
    const byTier = {}
    for (const t of window.TIERS) byTier[t.id] = []
    for (const m of models) {
      if (!passesFilter(m)) continue
      byTier[m.tier].push(m)
    }
    for (const t of Object.keys(byTier)) {
      byTier[t].sort((a, b) => b.score - a.score)
    }
    return byTier
  }

  // 在一个 tier 内，按"分数接近"贪心分桶
  // 桶大小限制：每桶 ≤ 7 个（≥ 7 时第 7+ 个折叠进可展开区）
  function bucketize(list, tolerance = 3) {
    const buckets = []
    for (const m of list) {
      if (buckets.length > 0) {
        const last = buckets[buckets.length - 1]
        if (last[0].score - m.score <= tolerance) {
          last.push(m)
          continue
        }
      }
      buckets.push([m])
    }
    return buckets
  }

  function rowKey(tierId, bucketIdx) {
    return `${tierId}:${bucketIdx}`
  }

  function render() {
    const container = $('#tiers-container')
    const byTier = groupByTier(allModels)

    const sections = window.TIERS.map((t) => {
      const list = byTier[t.id] || []
      if (list.length === 0) return ''
      const buckets = bucketize(list, 3)
      const total = list.length

      const rows = buckets
        .map((bucket, idx) => {
          const head = bucket[0]
          const tail = bucket.slice(1)
          const scoreRange = `${head.score.toFixed(0)}–${bucket[bucket.length - 1].score.toFixed(0)}`
          const key = rowKey(t.id, idx)
          const isExpanded = expandedRows.has(key)
          // 默认显示前 8 个，剩下的折叠
          const PRIMARY_LIMIT = 8
          const visible = bucket.slice(0, PRIMARY_LIMIT)
          const folded = bucket.slice(PRIMARY_LIMIT)
          const effortLabels = [...new Set(bucket.map((m) => effortOf(m)))]
            .filter((e) => e !== 'none')
            .map((e) => window.REASONING_LABEL[e] || e)
          const effortNote =
            effortLabels.length > 0
              ? ` <span class="row-effort-note">（含 ${effortLabels.join(' / ')}）</span>`
              : ''
          // 主行：分数段 + 卡片网格
          const cards = visible.map((m) => cardHTML(m)).join('')
          const more =
            folded.length > 0
              ? `<div class="row-more${isExpanded ? ' open' : ''}">
               <div class="grid grid-compact">${folded.map((m) => cardHTML(m, { compact: true })).join('')}</div>
             </div>`
              : ''
          const toggle =
            folded.length > 0
              ? `<button class="row-toggle${isExpanded ? ' open' : ''}" data-key="${key}">
               <span class="row-toggle-icon">${isExpanded ? '▲' : '▼'}</span>
               ${isExpanded ? '收起' : `+${folded.length} 个等价模型`}
             </button>`
              : ''
          return `
          <div class="row" data-tier="${t.id}">
            <div class="row-head">
              <span class="row-score-range" style="background:${t.color}">分 ${scoreRange}</span>
              <div class="row-cards">${cards}${more}${toggle}</div>
            </div>
            <div class="row-caption">能力相当（${bucket.length}）${effortNote}</div>
          </div>
        `
        })
        .join('')

      return `
        <section class="tier" data-tier="${t.id}">
          <h2 class="tier-title" style="border-left-color:${t.color}">
            ${escapeHTML(t.label)}
            <span class="tier-count">${total}</span>
          </h2>
          <div class="rows">${rows}</div>
        </section>
      `
    }).join('')

    container.innerHTML = sections

    $('#model-count').textContent = allModels.length
    $('#updated-at').textContent = formatDate(window.__DATA__.updated_at)

    // 绑定展开/折叠
    $$('.row-toggle').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key
        if (expandedRows.has(key)) expandedRows.delete(key)
        else expandedRows.add(key)
        render()
      })
    })
  }

  function formatDate(iso) {
    if (!iso) return '--'
    try {
      const d = new Date(iso)
      return d.toISOString().slice(0, 10)
    } catch (_) {
      return iso
    }
  }

  function bindControls() {
    $$('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        $$('.tab').forEach((b) => b.classList.remove('active'))
        btn.classList.add('active')
        currentFilter = btn.dataset.filter
        render()
      })
    })
    $('#search').addEventListener('input', (e) => {
      currentQuery = e.target.value.trim()
      render()
    })
  }

  async function init() {
    try {
      const resp = await fetch('data/models.json', { cache: 'no-store' })
      window.__DATA__ = await resp.json()
      allModels = window.__DATA__.models || []
    } catch (err) {
      $('#tiers-container').innerHTML =
        '<p class="error">数据加载失败。请检查 data/models.json 是否存在。</p>'
      console.error(err)
      return
    }
    bindControls()
    render()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
