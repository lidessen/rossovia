#!/usr/bin/env python3
"""Behavior test for the generated Sequence Markdown boundary."""

from __future__ import annotations

import importlib.util
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("sync-sequence-snapshot.py")
SPEC = importlib.util.spec_from_file_location("sync_sequence_snapshot", SCRIPT)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"could not load {SCRIPT}")
SYNC = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SYNC)


class SequenceMarkdownTest(unittest.TestCase):
    def test_discovers_new_skill_entrypoints_without_a_registry_update(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            skills = Path(directory)
            (skills / "existing").mkdir()
            (skills / "existing" / "SKILL.md").write_text("existing")
            (skills / "future-skill").mkdir()
            (skills / "future-skill" / "SKILL.md").write_text("future")
            (skills / "notes").mkdir()

            self.assertEqual(
                SYNC.discover_snapshot_skills(skills),
                ("existing", "future-skill"),
            )

    def test_demotes_headings_without_rewriting_fenced_code(self) -> None:
        source = """# Reading

```python
# code comment
```

~~~bash
## another code comment
~~~

## Boundary
"""
        expected = """### Reading

```python
# code comment
```

~~~bash
## another code comment
~~~

#### Boundary"""

        self.assertEqual(SYNC.demote_headings(source, 2), expected)

    def test_rebases_repository_links_but_not_fenced_examples(self) -> None:
        source_path = SYNC.REPO_ROOT / "principles" / "interpretations" / "P13.md"
        source = """[record](../adopted/fact-admission-gate.md#decision)
[external](https://example.com/source)

```markdown
[example](../adopted/not-a-real-link.md)
```
"""
        expected = f"""[record]({SYNC.CANONICAL_BLOB_BASE}principles/adopted/fact-admission-gate.md#decision)
[external](https://example.com/source)

```markdown
[example](../adopted/not-a-real-link.md)
```
"""

        self.assertEqual(
            SYNC.rebase_relative_markdown_links(source, source_path),
            expected,
        )

    def test_portable_link_validation_rejects_unresolved_relative_link(self) -> None:
        with self.assertRaises(SystemExit):
            SYNC.validate_portable_markdown_links(
                "[record](../adopted/fact-admission-gate.md)",
                Path("sequence.md"),
            )


if __name__ == "__main__":
    unittest.main()
