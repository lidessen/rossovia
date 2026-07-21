#!/usr/bin/env python3

from __future__ import annotations

import json
import os
import shlex
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CLI = ROOT / "scripts" / "intervention-reconciliation.py"
ADAPTER = ROOT / ".codex" / "hooks" / "intervention-reconciliation.py"


class InterventionReconciliationTest(unittest.TestCase):
    def run_cli(self, state_root: Path, *args: str, input: str | None = None) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            ["python3", str(CLI), "--state-root", str(state_root), *args],
            input=input,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_observation_and_receipt_are_session_local_and_do_not_retain_prompt_text(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            state_root = Path(temporary) / "state"
            payload = {
                "session_id": "session-1",
                "turn_id": "turn-1",
                "cwd": str(ROOT),
                "prompt": "Do not retain this secret correction text",
            }
            observed = self.run_cli(state_root, "observe", input=json.dumps(payload))
            self.assertEqual(observed.returncode, 0, observed.stderr)
            state_path = Path(json.loads(observed.stdout)["statePath"])
            self.assertNotIn(payload["prompt"], state_path.read_text())

            anchored = self.run_cli(state_root, "anchor", "--cwd", str(ROOT), "--summary", "terminal and output contracts")
            self.assertEqual(anchored.returncode, 0, anchored.stderr)
            reconciled = self.run_cli(
                state_root,
                "reconcile",
                "--cwd", str(ROOT),
                "--rejected-assumption", "terminal tool payload owns final output",
                "--new-invariant", "terminal tools and output schema are independent",
                "--affected-surface", "contracts",
                "--affected-surface", "tests",
                "--next-probe", "verify each condition independently",
            )
            self.assertEqual(reconciled.returncode, 0, reconciled.stderr)
            status = self.run_cli(state_root, "status", "--cwd", str(ROOT))
            self.assertEqual(status.returncode, 0, status.stderr)
            rendered = json.loads(status.stdout)
            self.assertEqual(rendered["observations"], 1)
            self.assertEqual(rendered["anchor"]["summary"], "terminal and output contracts")
            self.assertEqual(rendered["receipts"][0]["affectedSurfaces"], ["contracts", "tests"])

    def test_codex_adapter_keeps_one_session_binding_across_target_switches(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            environment = {**os.environ, "HOME": temporary}
            payload = {
                "session_id": "session-hook",
                "turn_id": "turn-hook",
                "cwd": str(ROOT),
                "prompt": "The previous boundary was wrong",
            }
            result = subprocess.run(
                ["python3", str(ADAPTER)],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                env=environment,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            hook_output = json.loads(result.stdout)
            context = hook_output["hookSpecificOutput"]["additionalContext"]
            self.assertIn("compare it with the active task", context)
            self.assertIn("advisory, not a mutation or authorization gate", context)
            self.assertIn("do not request broader filesystem permission", context)

            marker = "The exact session-local receipt endpoint is `"
            endpoint = context.split(marker, 1)[1].split("`", 1)[0]
            command = shlex.split(endpoint)
            self.assertEqual(command[-2:], ["reconcile", "--help"])

            second_repository = Path(temporary) / "second-repository"
            third_repository = Path(temporary) / "third-repository"
            state_paths = []
            for target in [second_repository, third_repository, second_repository]:
                reconciled = subprocess.run(
                    [
                        *command[:-1],
                        "--cwd", str(target),
                        "--rejected-assumption", "the last repository remains the active target",
                        "--new-invariant", "bind the receipt to the observed session across target switches",
                        "--affected-surface", str(target),
                        "--next-probe", "switch target repositories and return",
                    ],
                    text=True,
                    capture_output=True,
                    env=environment,
                    check=False,
                )
                self.assertEqual(reconciled.returncode, 0, reconciled.stderr)
                state_paths.append(Path(json.loads(reconciled.stdout)["statePath"]))

            self.assertEqual(len(set(state_paths)), 1)
            state_path = state_paths[0]
            self.assertTrue(state_path.is_file())
            self.assertEqual(state_path.parents[1], Path(temporary) / ".codex" / "intervention-reconciliation")
            state = json.loads(state_path.read_text())
            self.assertEqual(
                [receipt["affectedSurfaces"] for receipt in state["receipts"]],
                [[str(second_repository)], [str(third_repository)], [str(second_repository)]],
            )
            self.assertFalse((Path(temporary) / ".cache" / "intervention-reconciliation").exists())


if __name__ == "__main__":
    unittest.main()
