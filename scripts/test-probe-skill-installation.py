#!/usr/bin/env python3

from __future__ import annotations

import importlib.util
import os
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("probe-skill-installation.py")
SPEC = importlib.util.spec_from_file_location("probe_skill_installation", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"cannot load {SCRIPT}")
PROBE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PROBE)


class SkillInstallationProbeTest(unittest.TestCase):
    def test_separate_sibling_roots_are_allowed(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "source"
            target = root / "target"
            source.mkdir()
            target.mkdir()
            PROBE.require_disjoint(source, target)

    def test_same_and_nested_paths_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "source"
            nested = source / "target"
            nested.mkdir(parents=True)
            with self.assertRaises(PROBE.UnsafePathOverlap):
                PROBE.require_disjoint(source, source)
            with self.assertRaises(PROBE.UnsafePathOverlap):
                PROBE.require_disjoint(source, nested)
            with self.assertRaises(PROBE.UnsafePathOverlap):
                PROBE.require_disjoint(nested, source)

    def test_symlink_alias_to_source_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            source = root / "skills"
            source.mkdir()
            alias = root / "project" / ".agents" / "skills"
            alias.parent.mkdir(parents=True)
            os.symlink(source, alias)
            with self.assertRaises(PROBE.UnsafePathOverlap):
                PROBE.require_disjoint(source, alias)

    def test_manifest_exposes_content_changes(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            first = root / "first"
            second = root / "second"
            first.mkdir()
            second.mkdir()
            (first / "SKILL.md").write_text("first\n", encoding="utf-8")
            (second / "SKILL.md").write_text("second\n", encoding="utf-8")
            self.assertNotEqual(PROBE.tree_manifest(first), PROBE.tree_manifest(second))

    def test_skill_name_cannot_escape_skills_root(self) -> None:
        for name in ("", ".", "..", "../visual-design", "group/visual-design"):
            with self.subTest(name=name):
                with self.assertRaises(ValueError):
                    PROBE.validate_skill_name(name)


if __name__ == "__main__":
    unittest.main()
