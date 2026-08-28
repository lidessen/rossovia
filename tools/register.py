#!/usr/bin/env python3
"""登记脚本（tools/register.py）：capture 模式 + process 模式（design/agent-stack.md 5 第一批）。

capture 模式：追加到 notes/thinking-log.md，自动编号 THINK-YYYY-MM-DD-NNN，只追加不覆盖。
process 模式：追加到 notes/feedback-log.md，带 类型/来源/对象/standing 字段，编号 FB-YYYY-MM-DD-NNN。

语义判断（内容是否保真、分类是否恰当）归 LLM；本脚本只做机械编号与追加。

用法：
  tools/register.py capture "内容"                       # 记录思考片段（thinking-log）
  tools/register.py feedback "内容" -t 问题|新想法|理论意见|纠正 -s 来源 -o 对象 [-g standing]
"""
import argparse
import datetime
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THINK_LOG = os.path.join(ROOT, "notes", "thinking-log.md")
FEEDBACK_LOG = os.path.join(ROOT, "notes", "feedback-log.md")

TYPES = ("问题", "新想法", "理论意见", "纠正")
STANDINGS = ("stable", "unstable")


def next_id(log_path, prefix):
    """按 prefix-YYYY-MM-DD-NNN 找当天最大序号，返回下一个；找不到文件返回 001。"""
    today = datetime.date.today().strftime("%Y-%m-%d")
    n = 0
    if os.path.exists(log_path):
        with open(log_path, encoding="utf-8") as f:
            for line in f:
                m = re.search(rf"{prefix}-{re.escape(today)}-(\d+)", line)
                if m:
                    n = max(n, int(m.group(1)))
    return f"{prefix}-{today}-{n + 1:03d}"


def append(log_path, lines):
    os.makedirs(os.path.dirname(log_path), exist_ok=True)
    with open(log_path, "a", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    print(f"appended -> {os.path.relpath(log_path, ROOT)}")


def do_capture(content):
    if not content.strip():
        sys.exit("error: 内容为空")
    eid = next_id(THINK_LOG, "THINK")
    append(THINK_LOG, [f"### {eid}", f"> {content.strip()}", ""])
    print(f"entry: {eid}")


def do_feedback(content, ftype, source, obj, standing):
    if ftype not in TYPES:
        sys.exit(f"error: 类型必须是 {TYPES} 之一")
    if standing is not None and standing not in STANDINGS:
        sys.exit(f"error: standing 必须是 {STANDINGS} 之一")
    eid = next_id(FEEDBACK_LOG, "FB")
    lines = [
        f"### {eid}",
        f"- 类型: {ftype}",
        f"- 来源: {source}",
        f"- 对象: {obj}",
        f"- standing: {standing if standing else '（未定）'}",
        f"- 日期: {datetime.date.today().isoformat()}",
        f"- 内容: {content.strip()}",
        "",
    ]
    append(FEEDBACK_LOG, lines)
    print(f"entry: {eid}")


def main():
    p = argparse.ArgumentParser(description="登记脚本：capture（thinking-log）或 feedback（反馈分类登记）")
    sub = p.add_subparsers(dest="mode", required=True)
    c = sub.add_parser("capture", help="记录思考片段")
    c.add_argument("content")
    f = sub.add_parser("feedback", help="反馈分类登记")
    f.add_argument("content")
    f.add_argument("-t", "--type", required=True, help=f"类型: {'/'.join(TYPES)}")
    f.add_argument("-s", "--source", required=True, help="来源（如用户、观察、测试）")
    f.add_argument("-o", "--object", required=True, help="指向对象（如某 skill/条目/文件）")
    f.add_argument("-g", "--standing", help="stable/unstable")
    args = p.parse_args()
    if args.mode == "capture":
        do_capture(args.content)
    else:
        do_feedback(args.content, args.type, args.source, args.object, args.standing)


if __name__ == "__main__":
    main()
