"""
Fetch LLM leaderboard data from OpenRouter (公开 API), merge with hand-curated
seed models, bucket by (tier, reasoning_effort), and write the site's models.json.

设计：每个模型有 model_family（型号族）+ reasoning_effort（max/xhigh/high/medium/low），
前端按 (tier, reasoning_effort) 二维分组成"等价行"，每行内多卡片并排。

数据产物直接写入 public/llm-leaderboard/data/models.json（由本仓库的 Pages 构建一起发布）。
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

# 上榜门槛：低于该分数的模型（含 OpenRouter 长尾）不进入天梯图
MIN_SCORE = 70


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


# 思考档位排序（高→低）
REASONING_ORDER = ["max", "xhigh", "high", "medium", "low", "minimal", "none"]
REASONING_LABEL = {
    "max": "Max 推理", "xhigh": "XHigh 推理", "high": "High 推理",
    "medium": "Medium 推理", "low": "Low 推理", "minimal": "Minimal 推理",
    "none": "无推理",
}


# Hand-curated 2026 flagship models. 每个模型有:
#   - name / provider / score (能力分 0-100)
#   - model_family: 型号族（用于把同型号不同档位聚一起）
#   - reasoning_effort: max / xhigh / high / medium / low / none
# Score 在同 model_family 内按档位微调：max > xhigh > high > medium > low
CURATED = {
    "anthropic/claude-opus-5":          {"name": "Claude Opus 5",         "provider": "Anthropic", "model_family": "Claude Opus 5",   "reasoning_effort": "high",  "score": 98},
    "anthropic/claude-opus-5-fast":     {"name": "Claude Opus 5 (Fast)",  "provider": "Anthropic", "model_family": "Claude Opus 5",   "reasoning_effort": "medium","score": 95},
    "anthropic/claude-fable-5":         {"name": "Claude Fable 5",        "provider": "Anthropic", "model_family": "Claude Fable 5",  "reasoning_effort": "max",   "score": 97},
    "anthropic/claude-opus-4.7":        {"name": "Claude Opus 4.7",       "provider": "Anthropic", "model_family": "Claude Opus 4.7", "reasoning_effort": "high",  "score": 95},
    "anthropic/claude-opus-4.7-fast":   {"name": "Claude Opus 4.7 (Fast)","provider": "Anthropic", "model_family": "Claude Opus 4.7", "reasoning_effort": "medium","score": 92},
    "anthropic/claude-opus-4.6":        {"name": "Claude Opus 4.6",       "provider": "Anthropic", "model_family": "Claude Opus 4.6", "reasoning_effort": "high",  "score": 93},
    "anthropic/claude-sonnet-5":        {"name": "Claude Sonnet 5",       "provider": "Anthropic", "model_family": "Claude Sonnet 5", "reasoning_effort": "high",  "score": 93},

    "openai/gpt-5.6-sol-pro":           {"name": "GPT-5.6 Sol Pro",       "provider": "OpenAI",    "model_family": "GPT-5.6 Sol",     "reasoning_effort": "max",   "score": 96},
    "openai/gpt-5.6-sol":               {"name": "GPT-5.6 Sol",           "provider": "OpenAI",    "model_family": "GPT-5.6 Sol",     "reasoning_effort": "high",  "score": 95},
    "openai/gpt-5.6-terra-pro":         {"name": "GPT-5.6 Terra Pro",     "provider": "OpenAI",    "model_family": "GPT-5.6 Terra",   "reasoning_effort": "max",   "score": 92},
    "openai/gpt-5.6-terra":             {"name": "GPT-5.6 Terra",         "provider": "OpenAI",    "model_family": "GPT-5.6 Terra",   "reasoning_effort": "high",  "score": 90},
    "openai/gpt-5.6-luna-pro":          {"name": "GPT-5.6 Luna Pro",      "provider": "OpenAI",    "model_family": "GPT-5.6 Luna",    "reasoning_effort": "max",   "score": 88},
    "openai/gpt-5.6-luna":              {"name": "GPT-5.6 Luna",          "provider": "OpenAI",    "model_family": "GPT-5.6 Luna",    "reasoning_effort": "high",  "score": 86},
    "openai/gpt-5.4-pro":               {"name": "GPT-5.4 Pro",           "provider": "OpenAI",    "model_family": "GPT-5.4",         "reasoning_effort": "high",  "score": 88},
    "openai/gpt-5.4":                   {"name": "GPT-5.4",               "provider": "OpenAI",    "model_family": "GPT-5.4",         "reasoning_effort": "medium","score": 86},
    "openai/gpt-5.2-pro":               {"name": "GPT-5.2 Pro",           "provider": "OpenAI",    "model_family": "GPT-5.2",         "reasoning_effort": "high",  "score": 82},
    "openai/gpt-5.2":                   {"name": "GPT-5.2",               "provider": "OpenAI",    "model_family": "GPT-5.2",         "reasoning_effort": "medium","score": 80},

    "google/gemini-3.7-flash":          {"name": "Gemini 3.7 Flash",      "provider": "Google",    "model_family": "Gemini 3.7 Flash","reasoning_effort": "high",  "score": 93},
    "google/gemini-3.5-flash":          {"name": "Gemini 3.5 Flash",      "provider": "Google",    "model_family": "Gemini 3.5 Flash","reasoning_effort": "high",  "score": 85},
    "google/gemini-3-flash-preview":    {"name": "Gemini 3 Flash Preview","provider": "Google",    "model_family": "Gemini 3 Flash",  "reasoning_effort": "high",  "score": 90},
    "google/gemini-3.1-pro-preview":    {"name": "Gemini 3.1 Pro Preview","provider": "Google",    "model_family": "Gemini 3.1 Pro",  "reasoning_effort": "max",   "score": 88},
    "google/gemini-3.1-flash-lite":     {"name": "Gemini 3.1 Flash Lite", "provider": "Google",    "model_family": "Gemini 3.1 Flash","reasoning_effort": "medium","score": 78},

    "x-ai/grok-4.6":                    {"name": "Grok 4.6",              "provider": "xAI",       "model_family": "Grok 4.6",        "reasoning_effort": "high",  "score": 93},
    "x-ai/grok-4.5":                    {"name": "Grok 4.5",              "provider": "xAI",       "model_family": "Grok 4.5",        "reasoning_effort": "high",  "score": 89},
    "x-ai/grok-4.3":                    {"name": "Grok 4.3",              "provider": "xAI",       "model_family": "Grok 4.3",        "reasoning_effort": "high",  "score": 85},

    "meta/muse-spark-1.2":              {"name": "Muse Spark 1.2",        "provider": "Meta",      "model_family": "Muse Spark 1.2",  "reasoning_effort": "xhigh", "score": 92},
    "meta/muse-spark-1.1":              {"name": "Muse Spark 1.1",        "provider": "Meta",      "model_family": "Muse Spark 1.2",  "reasoning_effort": "high",  "score": 87},

    "moonshotai/kimi-k3":               {"name": "Kimi K3",               "provider": "Moonshot",  "model_family": "Kimi K3",         "reasoning_effort": "max",   "score": 92},
    "moonshotai/kimi-k2.7-code":        {"name": "Kimi K2.7 Code",        "provider": "Moonshot",  "model_family": "Kimi K2.7",       "reasoning_effort": "high",  "score": 80},
    "moonshotai/kimi-k2.6":             {"name": "Kimi K2.6",             "provider": "Moonshot",  "model_family": "Kimi K2.7",       "reasoning_effort": "high",  "score": 78},

    "z-ai/glm-5.3":                     {"name": "GLM 5.3",               "provider": "Zhipu",     "model_family": "GLM 5.3",         "reasoning_effort": "max",   "score": 92},
    "z-ai/glm-5.2":                     {"name": "GLM 5.2",               "provider": "Zhipu",     "model_family": "GLM 5.2",         "reasoning_effort": "high",  "score": 88},
    "z-ai/glm-5.1":                     {"name": "GLM 5.1",               "provider": "Zhipu",     "model_family": "GLM 5.1",         "reasoning_effort": "high",  "score": 82},

    "mistralai/mistral-medium-3.5":     {"name": "Mistral Medium 3.5",    "provider": "Mistral",   "model_family": "Mistral Medium 3.5","reasoning_effort": "high","score": 84},
    "mistralai/mistral-medium-3.1":     {"name": "Mistral Medium 3.1",    "provider": "Mistral",   "model_family": "Mistral Medium 3.1","reasoning_effort": "medium","score": 75},

    "qwen/qwen3.8-max":                 {"name": "Qwen3.8 Max",           "provider": "Alibaba",   "model_family": "Qwen3.8",         "reasoning_effort": "max",   "score": 91},
    "qwen/qwen3.8-2.4t-a95b":           {"name": "Qwen3.8 2.4T A95B",     "provider": "Alibaba",   "model_family": "Qwen3.8",         "reasoning_effort": "high",  "score": 88},
    "qwen/qwen3.8-27b":                 {"name": "Qwen3.8 27B",           "provider": "Alibaba",   "model_family": "Qwen3.8",         "reasoning_effort": "medium","score": 82},
    "qwen/qwen3.7-max":                 {"name": "Qwen3.7 Max",           "provider": "Alibaba",   "model_family": "Qwen3.7",         "reasoning_effort": "max",   "score": 87},
    "qwen/qwen3.7-plus":                {"name": "Qwen3.7 Plus",          "provider": "Alibaba",   "model_family": "Qwen3.7",         "reasoning_effort": "high",  "score": 82},
    "qwen/qwen3.7-flash":               {"name": "Qwen3.7 Flash",         "provider": "Alibaba",   "model_family": "Qwen3.7",         "reasoning_effort": "medium","score": 78},
    "qwen/qwen3.6-plus":                {"name": "Qwen3.6 Plus",          "provider": "Alibaba",   "model_family": "Qwen3.6",         "reasoning_effort": "high",  "score": 76},
    "qwen/qwen3.6-35b-a3b":             {"name": "Qwen3.6 35B A3B",       "provider": "Alibaba",   "model_family": "Qwen3.6",         "reasoning_effort": "medium","score": 75},

    "deepseek/deepseek-v4-pro-0813":    {"name": "DeepSeek V4 Pro 0813",  "provider": "DeepSeek",  "model_family": "DeepSeek V4",     "reasoning_effort": "max",   "score": 85},
    "deepseek/deepseek-v4-flash":       {"name": "DeepSeek V4 Flash",     "provider": "DeepSeek",  "model_family": "DeepSeek V4",     "reasoning_effort": "medium","score": 78},
    "deepseek/deepseek-v3.2":           {"name": "DeepSeek V3.2",         "provider": "DeepSeek",  "model_family": "DeepSeek V3.2",   "reasoning_effort": "high",  "score": 70},
    "deepseek/deepseek-v3.1-terminus":  {"name": "DeepSeek V3.1 Terminus","provider": "DeepSeek",  "model_family": "DeepSeek V3.1",   "reasoning_effort": "high",  "score": 65},

    "meta-llama/llama-4-maverick":      {"name": "Llama 4 Maverick",      "provider": "Meta",      "model_family": "Llama 4",         "reasoning_effort": "high",  "score": 79},
    "meta-llama/llama-4-scout":         {"name": "Llama 4 Scout",         "provider": "Meta",      "model_family": "Llama 4",         "reasoning_effort": "medium","score": 72},

    "openai/gpt-oss-120b":              {"name": "GPT-OSS 120B",          "provider": "OpenAI",    "model_family": "GPT-OSS",         "reasoning_effort": "high",  "score": 70},
    "openai/gpt-oss-20b":               {"name": "GPT-OSS 20B",           "provider": "OpenAI",    "model_family": "GPT-OSS",         "reasoning_effort": "low",   "score": 55},

    "microsoft/phi-4":                  {"name": "Phi-4",                 "provider": "Microsoft", "model_family": "Phi-4",           "reasoning_effort": "none",  "score": 55},

    "allenai/olmo-3-32b-think":         {"name": "OLMo 3 32B Think",      "provider": "AllenAI",   "model_family": "OLMo 3",          "reasoning_effort": "high",  "score": 50},
}


def assign_tier(score: float, curated: bool = False) -> str:
    """按绝对分数阈值分桶。"""
    if not curated:
        return "entry"
    for tier_name, min_score in [
        ("SOTA", 90), ("tier1", 80), ("tier2", 65), ("tier3", 50),
    ]:
        if score >= min_score:
            return tier_name
    return "entry"


def parse_provider_from_name(name: str) -> str:
    if ":" in name:
        return name.split(":", 1)[0].strip()
    return "Unknown"


def clean_name(name: str) -> str:
    if ":" in name:
        return name.split(":", 1)[1].strip()
    return name.strip()


def parse_effort_from_name(name: str) -> str | None:
    """从 name 里识别档位 (e.g. 'Claude Opus 4.7 (Fast)' -> 'medium', 'GPT-5.6 Sol Pro' -> 'max')"""
    n = name.lower()
    if "(fast)" in n or " fast" in n or " (fast)" in n:
        return "medium"  # Fast 档 = 弱化版
    if "pro" in n and "terra" not in n and "luna" not in n:
        return "max"
    if "max" in n:
        return "max"
    if "xhigh" in n:
        return "xhigh"
    if "high" in n:
        return "high"
    if "medium" in n or "med" in n:
        return "medium"
    if "low" in n:
        return "low"
    if "minimal" in n:
        return "minimal"
    return None


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
            })
        return out
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError,
            json.JSONDecodeError, OSError, ValueError):
        return []


def merge(curated: list, live: list) -> list:
    """合并 curated + live：curated 优先（带 reasoning_effort + family），live 补全长尾。"""
    by_raw = {}
    for m in curated:
        by_raw[m["raw_id"]] = m
    for m in live:
        if m["raw_id"] not in by_raw:
            ctx = m.get("context_length") or 0
            tail_score = min(50, max(30, 30 + (ctx / 1048576) * 20))
            # 从 name 推断档位
            eff = parse_effort_from_name(m["name"]) or "none"
            by_raw[m["raw_id"]] = {
                **m, "score": round(tail_score, 1), "curated": False,
                "model_family": m["name"],
                "reasoning_effort": eff,
            }
        else:
            by_raw[m["raw_id"]].setdefault("curated", True)
            by_raw[m["raw_id"]].setdefault("context_length", m.get("context_length"))
            by_raw[m["raw_id"]].setdefault("supported_efforts", m.get("supported_efforts", []))
    return list(by_raw.values())


def build_curated_list() -> list:
    out = []
    for raw_id, info in CURATED.items():
        out.append({"raw_id": raw_id, **info, "curated": True})
    return out


def main() -> None:
    curated = build_curated_list()
    live = fetch_openrouter()
    merged = merge(curated, live)
    for m in merged:
        m["tier"] = assign_tier(m["score"], curated=m.get("curated", False))
        m["open_source"] = is_open_source(m)
    merged = [m for m in merged if m["score"] >= MIN_SCORE]
    if not merged:
        raise SystemExit("No data available")
    output = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "source": "Hand-curated (LMArena/AA 2026) + OpenRouter live API",
        "count": len(merged),
        "models": sorted(merged, key=lambda x: -x["score"]),
    }
    out_dir = Path(__file__).resolve().parents[2] / "public" / "llm-leaderboard" / "data"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "models.json"
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    curated_n = sum(1 for m in merged if m.get("curated"))
    print(f"Wrote {len(merged)} models ({curated_n} curated) to {out_path}")


if __name__ == "__main__":
    main()
