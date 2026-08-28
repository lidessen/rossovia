#!/usr/bin/env python3
"""一致性检查脚本（tools/check.py）：design/agent-stack.md 5 第一批。

检查项（机械证据，确定性观察者）：
  1. skills frontmatter：.agents/skills/<name>/SKILL.md 必须有 name + description。
  2. 路由引用完整性：AGENTS.md 路由表提到的 skill 必须存在。
  3. 条目编号冲突：notes/ 下 THINK-* / FB-* 编号无重复。
  4. standing 失效引用：theory/ 中标记 unstable 的条目，若被 skill/AGENTS.md/design 引用则报告。

用法：tools/check.py [--quiet]
退出码：0 = 全部通过；1 = 发现问题。
"""
import argparse
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS_DIR = os.path.join(ROOT, ".agents", "skills")
AGENTS = os.path.join(ROOT, "AGENTS.md")
NOTES_DIR = os.path.join(ROOT, "notes")
THEORY_DIR = os.path.join(ROOT, "theory")

problems = []


def note(msg):
    if not QUIET:
        print(msg)


def walk_files(path, suffix=None):
    for dirpath, _dirs, files in os.walk(path):
        for fname in sorted(files):
            if suffix is None or fname.endswith(suffix):
                yield os.path.join(dirpath, fname)


# 1. frontmatter
def check_frontmatter():
    if not os.path.isdir(SKILLS_DIR):
        note(f"[skip] 无 skills 目录: {SKILLS_DIR}")
        return
    for skill_path in walk_files(SKILLS_DIR, "SKILL.md"):
        with open(skill_path, encoding="utf-8") as f:
            head = f.read(2000)
        name = re.search(r"^name:\s*(.+)$", head, re.M)
        desc = re.search(r"^description:\s*(.+)$", head, re.M)
        rel = os.path.relpath(skill_path, ROOT)
        if not name:
            problems.append(f"{rel}: 缺 frontmatter name")
        if not desc:
            problems.append(f"{rel}: 缺 frontmatter description")
    note(f"[check] frontmatter: {'通过' if not [p for p in problems if 'frontmatter' in p] else '见问题'}")


# 2. 路由引用
def check_routes():
    if not os.path.exists(AGENTS):
        return
    with open(AGENTS, encoding="utf-8") as f:
        content = f.read()
    table_section = content.split("| 场景 | 加载 skill |", 1)[-1]
    table_section = table_section.split("\n## ", 1)[0]  # 只取路由表部分
    refs = set(re.findall(r"`([a-z][a-z0-9-]*)`", table_section))
    existing = set()
    if os.path.isdir(SKILLS_DIR):
        for d in os.listdir(SKILLS_DIR):
            if os.path.isdir(os.path.join(SKILLS_DIR, d)):
                existing.add(d)
    for ref in refs:
        if ref not in existing:
            problems.append(f"AGENTS.md 路由表引用缺失的 skill: {ref}")
    # 反向：未挂载检查——存在的 skill 是否被路由表引用（G6：skill 挂载盲区）
    for d in sorted(existing):
        if d not in refs:
            problems.append(f"skill 未被 AGENTS.md 路由表挂载: {d}")
    note(f"[check] 路由引用: {len(refs)} 个引用，{'全部存在且全部挂载' if not [p for p in problems if '路由' in p or '挂载' in p] else '见问题'}")


# 3. 编号冲突
def check_ids():
    for log_name in ("thinking-log.md", "feedback-log.md"):
        path = os.path.join(NOTES_DIR, log_name)
        if not os.path.exists(path):
            continue
        ids = []
        with open(path, encoding="utf-8") as f:
            for line in f:
                m = re.match(r"###\s+((?:THINK|FB)-\d{4}-\d{2}-\d{2}-\d{3})", line)
                if m:
                    ids.append(m.group(1))
        dup = {i for i in ids if ids.count(i) > 1}
        if dup:
            problems.append(f"{log_name}: 编号重复 {sorted(dup)}")
    note(f"[check] 条目编号: {'无重复' if not [p for p in problems if '编号' in p] else '见问题'}")


# 4. standing 失效引用
def check_stale():
    if not os.path.isdir(THEORY_DIR):
        return
    unstable_terms = []
    for tpath in walk_files(THEORY_DIR, ".md"):
        with open(tpath, encoding="utf-8") as f:
            for line in f:
                if re.search(r"unstable", line, re.I):
                    # 提取该行附近的可引用标识（条目名/编号）
                    ids = re.findall(r"[Pp]\d{2}|[A-Z][A-Za-z-]{3,}", line)
                    unstable_terms.extend(ids)
    if not unstable_terms:
        return
    scan_targets = [AGENTS] + list(walk_files(SKILLS_DIR, ".md")) + list(walk_files(os.path.join(ROOT, "design"), ".md"))
    for target in scan_targets:
        if not os.path.exists(target):
            continue
        with open(target, encoding="utf-8") as f:
            content = f.read()
        hits = [t for t in set(unstable_terms) if t in content]
        if hits:
            note(f"[warn] {os.path.relpath(target, ROOT)} 引用了 unstable 条目: {sorted(set(hits))}")


def main():
    global QUIET
    p = argparse.ArgumentParser(description="一致性检查")
    p.add_argument("--quiet", action="store_true", help="只输出问题")
    args = p.parse_args()
    QUIET = args.quiet
    check_frontmatter()
    check_routes()
    check_ids()
    check_stale()
    if problems:
        print(f"发现问题 {len(problems)} 项:")
        for pr in problems:
            print("  -", pr)
        sys.exit(1)
    print("check: 全部通过")


if __name__ == "__main__":
    main()
