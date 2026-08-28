#!/usr/bin/env ruby
# frozen_string_literal: true

# Mechanical checkpoint for the living planning tree.
#
# This script checks structure and source accounting only. It does not infer
# semantic standing, assign owners, accept designs, or authorize implementation.

require "pathname"

ROOT = Pathname.new(__dir__).parent.realpath
ERRORS = []

def absolute(relative)
  ROOT.join(relative)
end

def require_file(relative)
  path = absolute(relative)
  ERRORS << "missing required file: #{relative}" unless path.file?
  path
end

def lines_for(path)
  path.file? ? File.readlines(path) : []
end

def line_count(path)
  lines_for(path).length
end

def byte_count(path)
  path.file? ? File.binread(path).bytesize : 0
end

def section(lines, heading)
  start = lines.index { |line| line.chomp == heading }
  unless start
    ERRORS << "missing heading: #{heading}"
    return []
  end

  rest = lines[(start + 1)..]
  finish = rest.index { |line| line.start_with?("#") }
  finish ? rest[0...finish] : rest
end

def first_table(lines, expected_header)
  start = lines.index { |line| line.start_with?("| ") }
  unless start
    ERRORS << "missing table with header #{expected_header.inspect}"
    return []
  end

  table = []
  lines[start..].each do |line|
    break unless line.start_with?("| ")

    table << line.chomp
  end

  unless table.first == expected_header
    ERRORS << "unexpected table header: expected #{expected_header.inspect}, got #{table.first.inspect}"
  end
  table
end

def data_rows(table)
  table.drop(2).reject(&:empty?)
end

def cells(row)
  parts = row.split("|")[1..]
  parts.pop if parts.last&.strip&.empty?
  parts.map(&:strip)
end

def check_table(path, heading, expected_header, expected_rows, expected_columns)
  lines = section(lines_for(path), heading)
  table = first_table(lines, expected_header)
  rows = data_rows(table)
  if rows.length != expected_rows
    ERRORS << "#{path}: #{heading} has #{rows.length} data rows, expected #{expected_rows}"
  end
  rows.each_with_index do |row, index|
    values = cells(row)
    if values.length != expected_columns
      ERRORS << "#{path}: #{heading} row #{index + 1} has #{values.length} cells, expected #{expected_columns}"
    elsif values.any?(&:empty?)
      ERRORS << "#{path}: #{heading} row #{index + 1} contains an empty cell"
    end
  end
  rows
end

def parse_measurement(table, prefix)
  row = table.find { |line| line.start_with?(prefix) }
  unless row
    ERRORS << "missing footprint row: #{prefix}"
    return nil
  end

  values = cells(row)
  unless values.length >= 3
    ERRORS << "malformed footprint row: #{row}"
    return nil
  end
  [Integer(values[1].delete(",")), Integer(values[2].delete(","))]
rescue ArgumentError
  ERRORS << "non-numeric footprint row: #{row}"
  nil
end

def parse_aggregate(line, label, expected)
  unless line
    ERRORS << "missing footprint aggregate: #{label}"
    return
  end

  actual = line.scan(/`([0-9,]+)`/).flatten.map { |value| Integer(value.delete(",")) }
  ERRORS << "#{label}: expected #{expected.inspect}, got #{actual.inspect}" unless actual == expected
end

def require_line_matching(path, pattern, label)
  lines = lines_for(path)
  return if lines.any? { |line| line.match?(pattern) }

  ERRORS << "missing #{label} in #{path}"
end

def check_collapsible_history(path, headings)
  relative = path
  path = absolute(relative)
  lines = lines_for(path)
  content = lines.join
  opening = content.scan("<details>").length
  closing = content.scan("</details>").length
  summaries = content.scan("<summary>").length

  if opening.zero? || opening != closing || opening != summaries
    ERRORS << "unbalanced collapsible history in #{relative}: details=#{opening}/#{closing}, summaries=#{summaries}"
  end

  headings.each do |heading|
    index = lines.index { |line| line.chomp == heading }
    unless index
      ERRORS << "missing history boundary #{heading.inspect} in #{relative}"
      next
    end

    window = lines[(index + 1)..(index + 8)] || []
    ERRORS << "history boundary is not followed by <details>: #{relative} #{heading.inspect}" unless window.include?("<details>\n")
  end
end

required = %w[
  AGENTS.md
  planning/README.md
  planning/item-ledger.md
  planning/roadmap.md
  planning/plan.md
  planning/phase-1-exit-review.md
  planning/inbox.md
  planning/inbox-history.md
  planning/transition-package.md
  bootstrap/AGENTS.md
  design/project-bootstrap.md
  planning/records/plan-current-only-reconstruction-2026-08-26.md
  theory/philosophy.md
  theory/gene-expression.md
  design/work-cell-protocol.md
  theory/research/agent-harness-throughput-research.md
].map { |relative| [relative, require_file(relative)] }.to_h

require_line_matching(required.fetch("planning/README.md"), /^## 整体性回顾与整理\s*$/, "overall checkpoint guidance")
require_line_matching(required.fetch("planning/item-ledger.md"), /^## 整体性回顾 checkpoint（/, "current overall checkpoint")
require_line_matching(required.fetch("planning/plan.md"), /^## 最近完成波次：plan current-only 重建\s*$/, "current-only plan wave")

plan_content = required.fetch("planning/plan.md").read
ERRORS << "plan must remain current-only and not contain HTML history folding" if plan_content.include?("<details>")
ERRORS << "plan must not contain dated history headings" if plan_content.match?(/^### \d{4}-\d{2}-\d{2}/)

check_collapsible_history(
  "planning/item-ledger.md",
  ["## 历史/迭代记录（默认折叠）"]
)
check_collapsible_history(
  "planning/roadmap.md",
  ["### 历史回返索引（默认折叠）", "### 历史回返索引（replan 之后，默认折叠）"]
)
check_collapsible_history(
  "planning/phase-1-exit-review.md",
  ["## 历史/迭代回返（默认折叠）"]
)
check_collapsible_history(
  "planning/index/skill-migration.md",
  ["## 记录"]
)
check_collapsible_history(
  "planning/records/workcell-contract-field-boundary-review.md",
  ["### 历史/迭代回返（默认折叠）"]
)

planning_paths = Dir[absolute("planning/**/*.md").to_s]
skill_paths = Dir[absolute(".agents/skills/*/SKILL.md").to_s]
archive_skill_paths = Dir[absolute("archive/skills/*/SKILL.md").to_s]
portable_skill_paths = Dir[absolute("skills/*/SKILL.md").to_s]

expected_readings = (1..16).map { |number| format("P%02d.md", number) }
actual_readings = Dir[absolute("theory/philosophy/P*.md").to_s].map { |path| File.basename(path) }.sort
unless actual_readings == expected_readings.sort
  ERRORS << "reading files: expected #{expected_readings.sort.inspect}, got #{actual_readings.inspect}"
end

planned_readings_line = lines_for(required.fetch("AGENTS.md")).find do |line|
  line.start_with?("- Planned readings:")
end
reading_count = expected_readings.length
unless planned_readings_line&.match?(/theory\/philosophy\/Pxx\.md/) &&
       planned_readings_line.include?("source-bound") &&
       planned_readings_line.include?("reading-candidate") &&
       planned_readings_line.match?(/\ball #{reading_count}\b/)
  ERRORS << "AGENTS.md planned-readings entry does not describe the current 16 source-bound reading candidates"
end

ERRORS << "expected 11 incubating skills, got #{skill_paths.length}" unless skill_paths.length == 11
ERRORS << "expected 29 archive skills, got #{archive_skill_paths.length}" unless archive_skill_paths.length == 29
ERRORS << "expected no portable skills, got #{portable_skill_paths.length}" unless portable_skill_paths.empty?

item_ledger = required.fetch("planning/item-ledger.md")
coverage_audit = require_file("planning/index/coverage-audit.md")
check_table(
  item_ledger,
  "## 总览",
  "| item | canonical source | standing | 当前可推进部分 | 当前处置 | 前置/出口 |",
  16,
  6
)
check_table(
  item_ledger,
  "## 顶层 item contract projection",
  "| item | consumer / owner | 依赖与允许范围 | 当前证据 standing | disposition / 阶段出口 | revisit |",
  16,
  6
)
check_table(
  coverage_audit,
  "## 3. P01–P16 reading work-package map",
  "| item | source entry | 当前 standing | 当前 bounded contribution | 依赖 / revisit |",
  16,
  5
)

planning_links = 0
planning_paths.each do |path|
  File.read(path).scan(/\[[^\]]*\]\(([^)]+)\)/).flatten.each do |target|
    clean = target.strip.sub(/\A</, "").sub(/>\z/, "")
    next if clean.empty? || clean.start_with?("#", "http://", "https://", "mailto:")

    relative = clean.split("#", 2).first.sub(/:\d+\z/, "")
    next if relative.empty?

    planning_links += 1
    linked = Pathname.new(path).dirname.join(relative).cleanpath
    ERRORS << "broken planning link: #{path} -> #{target}" unless linked.file?
  end
end

core_docs = %w[planning/README.md planning/item-ledger.md planning/plan.md planning/roadmap.md]
core_docs.each do |relative|
  headings = Hash.new { |hash, key| hash[key] = [] }
  lines_for(absolute(relative)).each_with_index do |line, index|
    match = line.match(/^(#+) (.+)$/)
    headings[match[2].strip] << index + 1 if match
  end
  duplicates = headings.select { |_heading, locations| locations.length > 1 }
  duplicates.each do |heading, locations|
    ERRORS << "duplicate full heading in #{relative}: #{heading.inspect} at #{locations.join(", ")}"
  end
end

throughput = require_file("theory/research/agent-harness-throughput-research.md")
throughput_lines = lines_for(throughput)
footprint_heading = throughput_lines.find { |line| line.start_with?("## 17. Current source footprint reconciliation") }&.chomp
footprint_heading ||= "## 17. Current source footprint reconciliation"
footprint_section = section(throughput_lines, footprint_heading)
footprint_table = first_table(footprint_section, "| context surface | current lines | current bytes | 与旧测量的关系 |")

ledger_lines = lines_for(item_ledger)
history_heading = "## 历史/迭代记录（默认折叠）"
history_index = ledger_lines.index { |line| line.chomp == history_heading }
if history_index
  ledger_current_bytes = ledger_lines[0...history_index].join.bytesize
  ledger_current_lines = history_index
else
  ERRORS << "missing item ledger history boundary: #{history_heading}"
  ledger_current_bytes = 0
  ledger_current_lines = 0
end

measurements = {
  "| `AGENTS.md` |" => [line_count(absolute("AGENTS.md")), byte_count(absolute("AGENTS.md"))],
  "| `planning/README.md` |" => [line_count(absolute("planning/README.md")), byte_count(absolute("planning/README.md"))],
  "| `planning/item-ledger.md` current projection" => [ledger_current_lines, ledger_current_bytes],
  "| `planning/item-ledger.md` full file |" => [line_count(item_ledger), byte_count(item_ledger)],
  "| `planning/plan.md` |" => [line_count(absolute("planning/plan.md")), byte_count(absolute("planning/plan.md"))],
  "| `planning/roadmap.md` |" => [line_count(absolute("planning/roadmap.md")), byte_count(absolute("planning/roadmap.md"))],
  "| 11 个 `.agents/skills/SKILL.md` 合计 |" => [skill_paths.sum { |path| line_count(Pathname.new(path)) }, skill_paths.sum { |path| byte_count(Pathname.new(path)) }]
}

actual_measurements = {}
measurements.each do |prefix, expected|
  actual_measurements[prefix] = parse_measurement(footprint_table, prefix)
  ERRORS << "footprint mismatch for #{prefix}: expected #{expected.inspect}, got #{actual_measurements[prefix].inspect}" unless actual_measurements[prefix] == expected
end

agents_bytes = measurements.fetch("| `AGENTS.md` |")[1]
readme_bytes = measurements.fetch("| `planning/README.md` |")[1]
plan_bytes = measurements.fetch("| `planning/plan.md` |")[1]
roadmap_bytes = measurements.fetch("| `planning/roadmap.md` |")[1]
skill_bytes = measurements.fetch("| 11 个 `.agents/skills/SKILL.md` 合计 |")[1]
entry_current = agents_bytes + readme_bytes + ledger_current_bytes
current_plus_plan_roadmap = entry_current + plan_bytes + roadmap_bytes
current_plus_plan_roadmap_skills = current_plus_plan_roadmap + skill_bytes
full_authority = agents_bytes + readme_bytes + byte_count(item_ledger) + plan_bytes + roadmap_bytes
full_authority_skills = full_authority + skill_bytes

parse_aggregate(
  footprint_section.find { |line| line.include?("入口 + current ledger") },
  "entry + current ledger",
  [entry_current, current_plus_plan_roadmap]
)
parse_aggregate(
  footprint_section.find { |line| line.include?("再加入 11 个 skills") },
  "current + plan/roadmap + skills + full authority",
  [current_plus_plan_roadmap_skills, full_authority, full_authority_skills]
)

if ERRORS.empty?
  puts "validated planning: #{planning_paths.length} planning files, #{planning_links} local links, " \
       "16/16 item rows, 16/16 contract rows, 16/16 reading packages, " \
       "#{skill_paths.length} incubating skills, #{archive_skill_paths.length} archive skills"
  exit 0
end

warn ERRORS.join("\n")
exit 1
