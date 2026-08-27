#!/usr/bin/env python3
"""证据链追踪脚本（tools/track.py）：design/agent-stack.md 5 第二批。

一张表记录四层证据（design/agent-stack.md 机制 5）：
  semantic  语义交接：结论进入 theory/design/plan/skill candidate
  carrier   载体交接：载体有 source identity/revision/lineage/review
  activation 激活观察：真实 harness 确实选择读取执行
  adoption  采用证据：后续 work 观察到目标关系并作出保留/改写/回退/不采用决定

记录追加到 notes/evidence-log.md，编号 EV-YYYY-MM-DD-NNN。
"载体存在≠activation，activation≠效果"——脚本只记录事实条目，不替 LLM 判断层级。

用法：tools/track.py --level semantic|carrier|activation|adoption --object 对象 [--note 说明] [--ref 引用]
"""
import argparse
import datetime
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EVIDENCE_LOG = os.path.join(ROOT, "notes", "evidence-log.md")

LEVELS = ("semantic", "carrier", "activation", "adoption")


def next_id():
    today = datetime.date.today().strftime("%Y-%m-%d")
    n = 0
    if os.path.exists(EVIDENCE_LOG):
        with open(EVIDENCE_LOG, encoding="utf-8") as f:
            for line in f:
                m = re.match(rf"### EV-{re.escape(today)}-(\d+)", line)
                if m:
                    n = max(n, int(m.group(1)))
    return f"EV-{today}-{n + 1:03d}"


def main():
    p = argparse.ArgumentParser(description="证据链追踪")
    p.add_argument("--level", required=True, choices=LEVELS, help="四层之一")
    p.add_argument("--object", required=True, help="证据对象（如某 skill/条目/结论）")
    p.add_argument("--note", default="", help="说明")
    p.add_argument("--ref", default="", help="引用（文件/条目 id）")
    args = p.parse_args()
    eid = next_id()
    lines = [
        f"### {eid}",
        f"- level: {args.level}",
        f"- object: {args.object}",
        f"- date: {datetime.date.today().isoformat()}",
    ]
    if args.ref:
        lines.append(f"- ref: {args.ref}")
    if args.note:
        lines.append(f"- note: {args.note}")
    lines.append("")
    os.makedirs(os.path.dirname(EVIDENCE_LOG), exist_ok=True)
    with open(EVIDENCE_LOG, "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"recorded {eid} ({args.level}: {args.object})")


if __name__ == "__main__":
    main()
