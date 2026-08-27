import unittest
import sys
from pathlib import Path

# 让 unittest 在 scripts/ 目录下也能 import 同目录的 fetch_models
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_models import assign_tier, merge, build_curated_list  # noqa: E402


class TestAssignTier(unittest.TestCase):
    def test_curated_sota(self):
        # curated + 分数 96 → SOTA
        self.assertEqual(assign_tier(96, curated=True), "SOTA")

    def test_curated_tier1(self):
        self.assertEqual(assign_tier(85, curated=True), "tier1")

    def test_curated_tier2(self):
        self.assertEqual(assign_tier(70, curated=True), "tier2")

    def test_curated_tier3(self):
        self.assertEqual(assign_tier(55, curated=True), "tier3")

    def test_curated_below_50_entry(self):
        self.assertEqual(assign_tier(40, curated=True), "entry")

    def test_non_curated_always_entry(self):
        # 非 curated 无论分数都是 entry
        self.assertEqual(assign_tier(96, curated=False), "entry")
        self.assertEqual(assign_tier(20, curated=False), "entry")


class TestMerge(unittest.TestCase):
    def test_dedup_by_raw_id(self):
        curated = [{"raw_id": "gpt-5", "score": 90, "name": "GPT-5", "curated": True,
                    "model_family": "GPT-5", "reasoning_effort": "high"}]
        live = [{"raw_id": "gpt-5", "name": "GPT-5 (live)", "provider": "OpenAI",
                 "context_length": 100000}]
        merged = merge(curated, live)
        self.assertEqual(len(merged), 1)
        # curated 的 score 保留
        self.assertEqual(merged[0]["score"], 90)

    def test_keeps_unique_live_as_tail(self):
        curated = [{"raw_id": "gpt-5", "score": 90, "name": "GPT-5", "curated": True,
                    "model_family": "GPT-5", "reasoning_effort": "high"}]
        live = [{"raw_id": "unknown/model", "name": "Unknown", "context_length": 32768,
                 "provider": "Unknown", "hf_id": None, "supported_efforts": []}]
        merged = merge(curated, live)
        self.assertEqual(len(merged), 2)
        unk = next(m for m in merged if m["raw_id"] == "unknown/model")
        # 长尾应该有 reasoning_effort 和 model_family
        self.assertIn("reasoning_effort", unk)
        self.assertIn("model_family", unk)
        self.assertGreaterEqual(unk["score"], 30)
        self.assertLessEqual(unk["score"], 50)

    def test_curated_list_has_family_and_effort(self):
        curated = build_curated_list()
        self.assertGreater(len(curated), 0)
        for m in curated:
            self.assertTrue(m.get("curated"))
            self.assertIn("score", m)
            self.assertIn("name", m)
            self.assertIn("provider", m)
            self.assertIn("model_family", m, f"{m['name']} 缺 model_family")
            self.assertIn("reasoning_effort", m, f"{m['name']} 缺 reasoning_effort")
            self.assertIn(m["reasoning_effort"],
                          ["max", "xhigh", "high", "medium", "low", "minimal", "none"],
                          f"{m['name']} 档位非法: {m['reasoning_effort']}")


if __name__ == "__main__":
    unittest.main()
