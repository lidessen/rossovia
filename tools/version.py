#!/usr/bin/env python3
"""版本快照脚本（tools/version.py）：design/agent-stack.md 5 第二批（核心）。

freeze：对当前组合（AGENTS.md + .agents/skills + design/agent-stack.md + theory/）打新版本号，
        记录每文件 sha256 指纹与版本说明，写入 design/versions.json。
list：   列出版本历史。
status： 显示当前工作区与最新冻结版本的文件差异（changed/added/missing）。

回退/切换：本脚本只冻结与展示；实际回退用 git（`git checkout <commit> -- <path>`），
          版本快照保证你知道"回退到哪"以及"当前和上一版的差异是什么"。

用法：tools/version.py freeze [--note 说明] | list | status
"""
import argparse
import datetime
import hashlib
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VERSIONS_FILE = os.path.join(ROOT, "design", "versions.json")

TRACKED = [
    "AGENTS.md",
    "design/agent-stack.md",
    "design/observability.md",
    "design/observability/reasonix.md",
]
TRACKED_DIRS = [".agents/skills", "theory"]


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def tracked_files():
    files = list(TRACKED)
    for d in TRACKED_DIRS:
        base = os.path.join(ROOT, d)
        if os.path.isdir(base):
            for dirpath, _dirs, names in os.walk(base):
                for n in sorted(names):
                    files.append(os.path.relpath(os.path.join(dirpath, n), ROOT))
    return [f for f in files if os.path.exists(os.path.join(ROOT, f))]


def load_versions():
    if not os.path.exists(VERSIONS_FILE):
        return []
    with open(VERSIONS_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_versions(vs):
    os.makedirs(os.path.dirname(VERSIONS_FILE), exist_ok=True)
    with open(VERSIONS_FILE, "w", encoding="utf-8") as f:
        json.dump(vs, f, ensure_ascii=False, indent=2)
        f.write("\n")


def do_freeze(note):
    vs = load_versions()
    version = f"v{len(vs) + 1}"
    snapshot = {
        "version": version,
        "date": datetime.datetime.now().isoformat(timespec="seconds"),
        "note": note or "",
        "files": {f: sha256(os.path.join(ROOT, f)) for f in tracked_files()},
    }
    vs.append(snapshot)
    save_versions(vs)
    print(f"frozen {version}: {len(snapshot['files'])} 个文件指纹已记录")


def do_list():
    vs = load_versions()
    if not vs:
        print("（无版本记录）")
        return
    for v in vs:
        print(f"{v['version']}  {v['date']}  {v['note']}")


def do_status():
    vs = load_versions()
    if not vs:
        print("（无版本记录，先 freeze）")
        return
    latest = vs[-1]
    current = {f: sha256(os.path.join(ROOT, f)) for f in tracked_files()}
    changed, added = [], []
    for f, h in current.items():
        if f in latest["files"]:
            if latest["files"][f] != h:
                changed.append(f)
        else:
            added.append(f)
    missing = [f for f in latest["files"] if not os.path.exists(os.path.join(ROOT, f))]
    print(f"当前 vs {latest['version']} ({latest['date']})")
    if changed:
        print("changed:")
        for f in changed:
            print("  -", f)
    if added:
        print("added:")
        for f in added:
            print("  -", f)
    if missing:
        print("missing:")
        for f in missing:
            print("  -", f)
    if not (changed or added or missing):
        print("无差异（与冻结版本一致）")


def main():
    p = argparse.ArgumentParser(description="版本快照")
    sub = p.add_subparsers(dest="cmd", required=True)
    fr = sub.add_parser("freeze", help="冻结当前组合为新版本")
    fr.add_argument("--note", default="")
    sub.add_parser("list", help="列出版本历史")
    sub.add_parser("status", help="当前与最新版本的差异")
    args = p.parse_args()
    if args.cmd == "freeze":
        do_freeze(args.note)
    elif args.cmd == "list":
        do_list()
    else:
        do_status()


if __name__ == "__main__":
    main()
