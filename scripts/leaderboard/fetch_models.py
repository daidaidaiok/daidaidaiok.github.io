"""
Fetch LLM leaderboard data, normalize against Artificial Analysis Intelligence
Index anchors, and write public/llm-leaderboard/data/models.json.

数据可信度规则（2026-10 重建）：
- 每个入选模型的 aa_index 必须来自可引用的公开来源（BENCHMARK_ANCHORS.source_url），
  禁止凭印象填写或"推算"分数。
- 站点展示分 = round(aa_index / 榜首aa_index * 100)，即相对榜首的指数百分比；
  MIN_SCORE=70 表示"达到榜首 70%"，低于该线的模型不上榜。
- OpenRouter 长尾（无基准值、此前是按上下文长度编造的占位分）已彻底废弃。
- 锚点只认 OpenRouter 在售目录里真实存在的 raw_id，下架即自动剔除。
- AA 指数会在版本更新时整体重定基（2026-08 快照榜首 62 → 2026-10 v4.3.2 榜首 58），
  新旧口径分数不可混用；换锚点必须整表换成同一份最新榜单快照。
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
ANCHORS_AS_OF = "2026-10"


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
# inclusionai/：同厂 ling-3.0 系列在 OpenRouter 带 hf_id（inclusionAI/Ling-3.0-flash），
#   该组织模型均开源权重，ling-3.1-flash 缺 hf_id 视为漏标。
# xiaomi/：MiMo 系列在 OpenRouter 带 hf_id（XiaomiMiMo/MiMo-V2.6-*）。
OPEN_SOURCE_ORGS = (
    "meta-llama/", "qwen/", "deepseek/",
    "mistralai/", "microsoft/", "01-ai/", "moonshotai/",
    "allenai/", "openai/gpt-oss",
    "google/gemma", "thudm/", "baichuan-inc/", "internlm/",
    "inclusionai/", "xiaomi/",
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
#                                    （2026-10 榜单快照，Intelligence Index v4.3.2 口径）
#   effort_measured                  榜单标注的评测推理档位；未注明则留空
#   source_url                       数值出处（人工复核入口）
#
# 2026-10-12 校对轮次（全部数值取自 AA 官方榜单同一份快照，整表统一口径）：
# - 榜首 Claude Opus 5.5 (max) = 58，AA 指数自 2026-08 旧口径（榜首 62）整体重定基，
#   旧锚点分数不可与新表混用，故 8 月条目全部作废重录。
# - 剔除（现行榜单已无分数或已下架）：Claude Fable 5、Claude Opus 5、GPT-5.6 Sol、
#   GPT-5.5、Opus 4.8、Grok 4.6、Gemini 3.7 Flash、Sonnet 5、Sonnet 4.6、
#   Muse Spark 1.2、DeepSeek V4 Flash 0731、Kimi K2.7 Code。
# - 剔除：Gemini 4 Argon（53）——AA 在榜但未上 OpenRouter 在售目录，等上架再收。
# - 同一模型只收录榜单头牌推理档位（如 Opus 5.5 收 max 不收 xhigh）。
# ---------------------------------------------------------------------------
_SRC_AA_BOARD = "https://artificialanalysis.ai/leaderboards/models"

BENCHMARK_ANCHORS = {
    "anthropic/claude-opus-5.5": {
        "name": "Claude Opus 5.5", "provider": "Anthropic",
        "model_family": "Claude Opus 5.5", "effort_measured": "max", "aa_index": 58,
        # 现行榜首（2026-09-22 发布）
        "source_url": _SRC_AA_BOARD,
    },
    "anthropic/claude-sonnet-5.5": {
        "name": "Claude Sonnet 5.5", "provider": "Anthropic",
        "model_family": "Claude Sonnet 5.5", "effort_measured": "max", "aa_index": 56,
        "source_url": _SRC_AA_BOARD,
    },
    "anthropic/claude-fable-5.1": {
        "name": "Claude Fable 5.1", "provider": "Anthropic",
        "model_family": "Claude Fable 5.1", "effort_measured": "max", "aa_index": 53,
        "source_url": _SRC_AA_BOARD,
    },
    "openai/gpt-6-astra": {
        "name": "GPT-6 Astra", "provider": "OpenAI",
        "model_family": "GPT-6 Astra", "effort_measured": "max", "aa_index": 53,
        "source_url": _SRC_AA_BOARD,
    },
    "openai/gpt-6.1-sol": {
        "name": "GPT-6.1 Sol", "provider": "OpenAI",
        "model_family": "GPT-6.1 Sol", "effort_measured": "max", "aa_index": 52,
        "source_url": _SRC_AA_BOARD,
    },
    "meta/muse-spark-1.3": {
        "name": "Muse Spark 1.3", "provider": "Meta",
        "model_family": "Muse Spark 1.3", "effort_measured": "max", "aa_index": 48,
        "source_url": _SRC_AA_BOARD,
    },
    "x-ai/grok-4.7": {
        "name": "Grok 4.7", "provider": "SpaceXAI",
        "model_family": "Grok 4.7", "effort_measured": "xhigh", "aa_index": 46,
        "source_url": _SRC_AA_BOARD,
    },
    "xiaomi/mimo-v2.6-pro": {
        "name": "MiMo-V2.6-Pro", "provider": "Xiaomi",
        "model_family": "MiMo-V2.6", "aa_index": 46,
        # AA 官方 FAQ：当前最强开源权重模型
        "source_url": _SRC_AA_BOARD,
    },
    "qwen/qwen3.8-max-0902": {
        "name": "Qwen3.8 Max 0902", "provider": "Alibaba",
        "model_family": "Qwen3.8", "aa_index": 45,
        "source_url": _SRC_AA_BOARD,
    },
    "z-ai/glm-5.3": {
        "name": "GLM-5.3", "provider": "Z.ai",
        "model_family": "GLM-5.3", "effort_measured": "max", "aa_index": 45,
        # AA 官方 FAQ 开源权重前三（MiMo 46 / GLM 45 / Kimi 44）
        "source_url": _SRC_AA_BOARD,
    },
    "stepfun/step-5-preview": {
        "name": "Step 5 Preview", "provider": "StepFun",
        "model_family": "Step 5", "aa_index": 44,
        "source_url": _SRC_AA_BOARD,
    },
    "moonshotai/kimi-k3": {
        "name": "Kimi K3", "provider": "Moonshot",
        "model_family": "Kimi K3", "effort_measured": "max", "aa_index": 44,
        "source_url": _SRC_AA_BOARD,
    },
    "anthropic/claude-haiku-5.5": {
        "name": "Claude Haiku 5.5", "provider": "Anthropic",
        "model_family": "Claude Haiku 5.5", "effort_measured": "max", "aa_index": 43,
        "source_url": _SRC_AA_BOARD,
    },
    "openai/gpt-5.6-terra": {
        "name": "GPT-5.6 Terra", "provider": "OpenAI",
        "model_family": "GPT-5.6 Terra", "effort_measured": "max", "aa_index": 42,
        "source_url": _SRC_AA_BOARD,
    },
    "z-ai/glm-5.3-flash": {
        "name": "GLM-5.3-Flash", "provider": "Z.ai",
        "model_family": "GLM-5.3", "aa_index": 42,
        "source_url": _SRC_AA_BOARD,
    },
    "inclusionai/ling-3.1-flash": {
        "name": "Ling 3.1 Flash", "provider": "inclusionAI",
        "model_family": "Ling 3.1", "aa_index": 41,
        "source_url": _SRC_AA_BOARD,
    },
    "google/gemini-3.8-flash": {
        "name": "Gemini 3.8 Flash", "provider": "Google",
        "model_family": "Gemini 3.8 Flash", "effort_measured": "high", "aa_index": 41,
        "source_url": _SRC_AA_BOARD,
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
        "source": "Artificial Analysis Intelligence Index（2026-10 榜单快照，"
                  "v4.3.2 口径），展示分 = aa_index / 榜首 * 100",
        "aa_index_version": "v4.3.2",
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
