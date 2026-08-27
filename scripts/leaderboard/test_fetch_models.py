import unittest
import sys
from pathlib import Path

# 让 unittest 在 scripts/ 目录下也能 import 同目录的 fetch_models
sys.path.insert(0, str(Path(__file__).resolve().parent))

import fetch_models
from fetch_models import assign_tier, build_models, BENCHMARK_ANCHORS  # noqa: E402


class TestAssignTier(unittest.TestCase):
    def test_sota(self):
        self.assertEqual(assign_tier(90), "SOTA")
        self.assertEqual(assign_tier(100), "SOTA")

    def test_tier1(self):
        self.assertEqual(assign_tier(80), "tier1")
        self.assertEqual(assign_tier(89), "tier1")

    def test_tier2(self):
        self.assertEqual(assign_tier(65), "tier2")
        self.assertEqual(assign_tier(79), "tier2")

    def test_entry(self):
        self.assertEqual(assign_tier(64), "entry")


class TestAnchors(unittest.TestCase):
    """锚点表完整性：每条都必须可追溯，禁止无出处数值。"""

    def test_every_anchor_has_source_and_score(self):
        self.assertGreater(len(BENCHMARK_ANCHORS), 0)
        for raw_id, info in BENCHMARK_ANCHORS.items():
            self.assertIsInstance(info["aa_index"], int, f"{raw_id} aa_index 非整数")
            self.assertTrue(0 < info["aa_index"] <= 100, f"{raw_id} aa_index 越界")
            self.assertTrue(info["source_url"].startswith("https://"),
                            f"{raw_id} 缺出处 URL")
            self.assertTrue(info["name"].strip(), f"{raw_id} 缺 name")
            self.assertTrue(info["provider"].strip(), f"{raw_id} 缺 provider")
            self.assertTrue(info["model_family"].strip(), f"{raw_id} 缺 model_family")


class TestBuildModels(unittest.TestCase):
    def _fake_live(self, ids):
        return [{"raw_id": i, "name": i.split("/")[-1], "provider": "X",
                 "context_length": 100000, "hf_id": None, "supported_efforts": []}
                for i in ids]

    def test_normalization_relative_to_leader(self):
        original = dict(fetch_models.BENCHMARK_ANCHORS)
        try:
            fetch_models.BENCHMARK_ANCHORS = {
                "a/leader": {"name": "L", "provider": "P", "model_family": "F",
                             "aa_index": 62, "source_url": "https://x.example"},
                "a/mid": {"name": "M", "provider": "P", "model_family": "F",
                          "aa_index": 31, "source_url": "https://x.example"},
            }
            models, dropped = build_models(self._fake_live(["a/leader", "a/mid"]))
            self.assertEqual(dropped, [])
            by_id = {m["raw_id"]: m for m in models}
            self.assertEqual(by_id["a/leader"]["score"], 100)
            self.assertEqual(by_id["a/mid"]["score"], 50)
        finally:
            fetch_models.BENCHMARK_ANCHORS = original

    def test_drops_anchor_absent_from_live_catalog(self):
        original = dict(fetch_models.BENCHMARK_ANCHORS)
        try:
            fetch_models.BENCHMARK_ANCHORS = {
                "a/live-model": {"name": "A", "provider": "P", "model_family": "F",
                                 "aa_index": 60, "source_url": "https://x.example"},
                "b/dead-model": {"name": "B", "provider": "P", "model_family": "F",
                                 "aa_index": 55, "source_url": "https://x.example"},
            }
            models, dropped = build_models(self._fake_live(["a/live-model"]))
            self.assertEqual([m["raw_id"] for m in models], ["a/live-model"])
            self.assertEqual(dropped, ["b/dead-model"])
        finally:
            fetch_models.BENCHMARK_ANCHORS = original

    def test_derived_ids_fold_into_canonical(self):
        original = dict(fetch_models.BENCHMARK_ANCHORS)
        try:
            fetch_models.BENCHMARK_ANCHORS = {
                "a/model": {"name": "A", "provider": "P", "model_family": "F",
                            "aa_index": 50, "source_url": "https://x.example"},
            }
            models, dropped = build_models(
                self._fake_live(["a/model:batch", "a/model"]))
            self.assertEqual(dropped, [])
            self.assertEqual(models[0]["context_length"], 100000)
        finally:
            fetch_models.BENCHMARK_ANCHORS = original


if __name__ == "__main__":
    unittest.main()
