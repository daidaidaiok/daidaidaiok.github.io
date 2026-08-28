"""
Fetch LLM leaderboard data, normalize against Artificial Analysis Intelligence
Index anchors, and write public/llm-leaderboard/data/models.json.

数据可信度规则（2026-08 重建）：
- 每个入选模型的 aa_index 必须来自可引用的公开来源（BENCHMARK_ANCHORS.source_url），
  禁止凭印象填写或"推算"分数。
- 站点展示分 = round(aa_index / 榜首aa_index * 100)，即相对榜首的指数百分比；
  MIN_SCORE=70 表示"达到榜首 70%"，低于该线的模型不上榜。
- OpenRouter 长尾（无基准值、此前是按上下文长度编造的占位分）已彻底废弃。
- 锚点只认 OpenRouter 在售目录里真实存在的 raw_id，下架即自动剔除。
"""
import ipaddress
import json
import socket
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

ALLOWED_HOSTS = {"openrouter.ai"}

# 上榜门槛：展示分（相对榜首 %）低于该值的模型不进入天梯图
MIN_SCORE = 70

# 归一化日期快照：AA 指数随版本漂移，锚点数值以此时间的公开报道为准
ANCHORS_AS_OF = "2026-08"


def _safe_urlopen(url: str, timeout: int = 30):
    """受控的 HTTP 请求：只允许 https + 白名单域名 + 解析后的公网 IP（防 SSRF）。"""
    parsed = urlparse(url)
    if parsed.scheme != "https":
        raise ValueError(f"Refusing non-HTTPS URL: {url}")
    host = parsed.hostname or ""
    if host not in ALLOWED_HOSTS:
        raise ValueError(f"Refusing non-whitelisted host: {host}")
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except socket.gaierror as e:
        raise ValueError(f"DNS resolution failed for {host}: {e}") from e
    for family, _, _, _, sockaddr in infos:
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_loopback or ip.is_link_local or ip.is_unspecified or ip.is_multicast:
            raise ValueError(f"Refusing unsafe IP {ip} for host {host}")
        if (ip.version == 4 and ip in ipaddress.ip_network("10.0.0.0/8")) \
           or (ip.version == 4 and ip in ipaddress.ip_network("172.16.0.0/12")) \
           or (ip.version == 4 and ip in ipaddress.ip_network("192.168.0.0/16")) \
           or (ip.version == 6 and ip in ipaddress.ip_network("fc00::/7")):
            raise ValueError(f"Refusing private IP {ip} for host {host}")
    req = urllib.request.Request(url, headers={"User-Agent": "llm-leaderboard/1.0"})
    return urllib.request.urlopen(req, timeout=timeout)


# 开源组织前缀（仅在 hf_id 缺失时使用）
OPEN_SOURCE_ORGS = (
    "meta-llama/", "qwen/", "deepseek/",
    "mistralai/", "microsoft/", "01-ai/", "moonshotai/",
    "allenai/", "openai/gpt-oss",
    "google/gemma", "thudm/", "baichuan-inc/", "internlm/",
)


def is_open_source(model: dict) -> bool:
    """权威判断：优先看 hugging_face_id（非 None 即开源权重），raw_id 前缀作为后备。"""
    if model.get("hf_id"):
        return True
    raw = model.get("raw_id", "") or ""
    return any(raw.startswith(p) for p in OPEN_SOURCE_ORGS)


# ---------------------------------------------------------------------------
# 基准锚点表 —— 天梯图唯一的数据源
#
# 每条记录：
#   name / provider / model_family   展示信息
#   aa_index                         Artificial Analysis Intelligence Index 原始值
#                                    （2026-08 公开报道口径）
#   effort_measured                  有明确报道的评测推理档位；未注明则留空
#   source_url                       数值出处（人工复核入口）
#
# 2026-08-27 校对轮次删除了所有查不到出处的旧 curated 条目（GPT-5.4/5.2 系列、
# Opus 4.7 及以下、Qwen3.7/3.6、GLM-5.2/5.1、Mistral Medium 等）。它们不是不存在，
# 只是本轮没有拿到可信数值；后续校对拿到出处再放行。
# ---------------------------------------------------------------------------
_SRC_ROBOTMUNKI = "https://robotmunki.com/blog/llm-landscape"
_SRC_GREENFLAG = "https://greenflagdigital.com/top-ai-models-ranked/"
_SRC_AA_SONNET = "https://artificialanalysis.ai/articles/claude-sonnet-5-agentic-cost"
_SRC_AA_GPT56 = "https://artificialanalysis.ai/articles/gpt-5-6-has-landed"
_SRC_AA_MUSE = "https://artificialanalysis.ai/articles/muse-spark-1-2"
_SRC_ORCA = "https://www.orcarouter.ai/blog/gemini-3-7-flash-vs-deepseek-v4-flash"

BENCHMARK_ANCHORS = {
    "anthropic/claude-fable-5": {
        "name": "Claude Fable 5", "provider": "Anthropic",
        "model_family": "Claude Fable 5", "aa_index": 62,
        "source_url": _SRC_GREENFLAG,
    },
    "anthropic/claude-opus-5": {
        "name": "Claude Opus 5", "provider": "Anthropic",
        "model_family": "Claude Opus 5", "aa_index": 61,
        "source_url": _SRC_ROBOTMUNKI,
    },
    "x-ai/grok-4.6": {
        "name": "Grok 4.6", "provider": "xAI",
        "model_family": "Grok 4.6", "aa_index": 61,
        "source_url": _SRC_GREENFLAG,
    },
    "openai/gpt-5.6-sol": {
        "name": "GPT-5.6 Sol", "provider": "OpenAI",
        "model_family": "GPT-5.6 Sol", "effort_measured": "max", "aa_index": 61,
        "source_url": "https://artificialanalysis.ai/leaderboards/models",
    },
    "z-ai/glm-5.3": {
        "name": "GLM 5.3", "provider": "Zhipu",
        "model_family": "GLM 5.3", "aa_index": 60,
        "source_url": _SRC_ROBOTMUNKI,
    },
    "moonshotai/kimi-k3": {
        "name": "Kimi K3", "provider": "Moonshot",
        "model_family": "Kimi K3", "effort_measured": "max", "aa_index": 60,
        "source_url": _SRC_ROBOTMUNKI,
    },
    "google/gemini-3.7-flash": {
        "name": "Gemini 3.7 Flash", "provider": "Google",
        "model_family": "Gemini 3.7 Flash", "aa_index": 56,
        "source_url": _SRC_ORCA,
    },
    "qwen/qwen3.8-max": {
        "name": "Qwen3.8 Max", "provider": "Alibaba",
        "model_family": "Qwen3.8", "aa_index": 56,
        # 来源给出 56–58 区间，取保守低值
        "source_url": _SRC_ORCA,
    },
    "openai/gpt-5.6-terra": {
        "name": "GPT-5.6 Terra", "provider": "OpenAI",
        "model_family": "GPT-5.6 Terra", "effort_measured": "max", "aa_index": 55,
        "source_url": _SRC_AA_GPT56,
    },
    "openai/gpt-5.5": {
        "name": "GPT-5.5 (xhigh)", "provider": "OpenAI",
        "model_family": "GPT-5.5", "effort_measured": "xhigh", "aa_index": 55,
        # AA Sonnet 5 文：53 只落后 GPT-5.5 xhigh 2–3 分 → 取 55
        "source_url": _SRC_AA_SONNET,
    },
    "anthropic/claude-opus-4.8": {
        "name": "Claude Opus 4.8 (max)", "provider": "Anthropic",
        "model_family": "Claude Opus 4.8", "effort_measured": "max", "aa_index": 55,
        # 同上出处：与 GPT-5.5 xhigh 同档
        "source_url": _SRC_AA_SONNET,
    },
    "meta/muse-spark-1.2": {
        "name": "Muse Spark 1.2", "provider": "Meta",
        "model_family": "Muse Spark 1.2", "effort_measured": "xhigh", "aa_index": 54,
        "source_url": _SRC_AA_MUSE,
    },
    "deepseek/deepseek-v4-pro-0813": {
        "name": "DeepSeek V4 Pro 0813", "provider": "DeepSeek",
        "model_family": "DeepSeek V4", "aa_index": 53,
        "source_url": "https://x.com/ArtificialAnlys/status/2088440350734201149",
    },
    "anthropic/claude-sonnet-5": {
        "name": "Claude Sonnet 5", "provider": "Anthropic",
        "model_family": "Claude Sonnet 5", "effort_measured": "max", "aa_index": 53,
        "source_url": _SRC_AA_SONNET,
    },
    "deepseek/deepseek-v4-flash-0731": {
        "name": "DeepSeek V4 Flash 0731", "provider": "DeepSeek",
        "model_family": "DeepSeek V4", "aa_index": 52,
        # AA 官方推文：仅比 V4 Pro 低 1 分
        "source_url": "https://x.com/ArtificialAnlys/status/2088440350734201149",
    },
    "openai/gpt-5.6-luna": {
        "name": "GPT-5.6 Luna", "provider": "OpenAI",
        "model_family": "GPT-5.6 Luna", "effort_measured": "max", "aa_index": 51,
        "source_url": _SRC_AA_GPT56,
    },
    "anthropic/claude-sonnet-4.6": {
        "name": "Claude Sonnet 4.6", "provider": "Anthropic",
        "model_family": "Claude Sonnet 4.6", "aa_index": 47,
        # AA Sonnet 5 文：Sonnet 5 max 比 Sonnet 4.6 高 6 分 → 47
        "source_url": _SRC_AA_SONNET,
    },
    "moonshotai/kimi-k2.7-code": {
        "name": "Kimi K2.7 Code", "provider": "Moonshot",
        "model_family": "Kimi K2.7", "aa_index": 43,
        "source_url": "https://artificialanalysis.ai/models/kimi-k2-7-code",
    },
}


def assign_tier(score: float) -> str:
    """展示分（归一化后）分桶。"""
    if score >= 90:
        return "SOTA"
    if score >= 80:
        return "tier1"
    if score >= 65:
        return "tier2"
    return "entry"


def parse_provider_from_name(name: str) -> str:
    if ":" in name:
        return name.split(":", 1)[0].strip()
    return "Unknown"


def clean_name(name: str) -> str:
    if ":" in name:
        return name.split(":", 1)[1].strip()
    return name.strip()


TOKENS_100B = 10_000_000_000
TOKENS_1M = 1_000_000

def _parse_pricing(raw: dict | None) -> dict | None:
    if not raw or not isinstance(raw, dict):
        return None
    out: dict = {}
    for k in ("prompt", "completion", "input_cache_read", "input_cache_write",
              "input_cache_write_1h", "image", "audio"):
        if k in raw and raw[k] is not None:
            try:
                out[k] = float(raw[k])
            except (ValueError, TypeError):
                out[k] = None
        else:
            out[k] = None
    # 是否有至少一个有效价格
    if all(v is None for v in out.values()):
        return None
    # 保留原始 overrides 信息仅作透传，不参与计算
    return out


def _compute_pricing_costs(pricing: dict | None) -> dict | None:
    if not pricing:
        return None
    prompt = pricing.get("prompt")
    completion = pricing.get("completion")
    cache_read = pricing.get("input_cache_read")
    per_million = {
        "input": round(prompt * TOKENS_1M, 4) if prompt is not None else None,
        "output": round(completion * TOKENS_1M, 4) if completion is not None else None,
        "cache_hit": round(cache_read * TOKENS_1M, 4) if cache_read is not None else None,
    }
    per_100b = {
        "input": round(prompt * TOKENS_100B, 2) if prompt is not None else None,
        "output": round(completion * TOKENS_100B, 2) if completion is not None else None,
        "cache_hit": round(cache_read * TOKENS_100B, 2) if cache_read is not None else None,
    }
    return {"per_million": per_million, "per_100B": per_100b, "currency": "USD"}


def fetch_openrouter() -> list:
    """抓取 OpenRouter /models。失败返回空列表。"""
    try:
        with _safe_urlopen("https://openrouter.ai/api/v1/models", timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        out = []
        for m in data.get("data", []):
            raw_id = m.get("id", "")
            or_name = m.get("name", "")
            out.append({
                "raw_id": raw_id,
                "name": clean_name(or_name),
                "provider": parse_provider_from_name(or_name),
                "context_length": m.get("context_length"),
                "hf_id": m.get("hugging_face_id"),
                "supported_efforts": (m.get("reasoning") or {}).get("supported_efforts", []),
                "pricing_raw": m.get("pricing"),
            })
        return out
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError,
            json.JSONDecodeError, OSError, ValueError):
        return []


def build_models(live: list) -> list:
    """锚点 × 在售目录求交，补全 context_length / 开源性 / 定价，输出统一结构。"""
    canonical = {}
    for m in live:
        base = m["raw_id"].split(":")[0]
        # 非 batch/free 等衍生 ID 才代表本体
        canonical.setdefault(base, m)

    top_aa = max(a["aa_index"] for a in BENCHMARK_ANCHORS.values())
    models = []
    dropped = []
    for raw_id, info in BENCHMARK_ANCHORS.items():
        live_m = canonical.get(raw_id)
        if live_m is None:
            dropped.append(raw_id)
            continue
        score = round(info["aa_index"] / top_aa * 100)
        pricing = _parse_pricing(live_m.get("pricing_raw"))
        costs = _compute_pricing_costs(pricing)
        models.append({
            "raw_id": raw_id,
            "name": info["name"],
            "provider": info["provider"],
            "model_family": info["model_family"],
            "reasoning_effort": info.get("effort_measured") or "none",
            "score": score,
            "aa_index": info["aa_index"],
            "benchmark_as_of": ANCHORS_AS_OF,
            "benchmark_source": info["source_url"],
            "curated": True,
            "context_length": live_m.get("context_length"),
            "hf_id": live_m.get("hf_id"),
            "supported_efforts": live_m.get("supported_efforts", []),
            "tier": assign_tier(score),
            "open_source": is_open_source(live_m),
            "pricing": pricing,
            "pricing_costs": costs,
        })
    return models, dropped


def main() -> None:
    live = fetch_openrouter()
    merged, dropped = build_models(live)
    merged = [m for m in merged if m["score"] >= MIN_SCORE]
    if not merged:
        raise SystemExit("No data available")
    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Artificial Analysis Intelligence Index（2026-08 公开报道口径），"
                  "展示分 = aa_index / 榜首 * 100",
        "scale": {"kind": "relative_percent_of_leader", "leader_aa_index":
                  max(m["aa_index"] for m in merged)},
        "count": len(merged),
        "models": sorted(merged, key=lambda x: -x["score"]),
    }
    out_dir = Path(__file__).resolve().parents[2] / "public" / "llm-leaderboard" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "models.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(merged)} models to {out_path}")
    if dropped:
        print(f"Dropped (no longer on OpenRouter): {', '.join(dropped)}")


if __name__ == "__main__":
    main()
