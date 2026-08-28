#!/usr/bin/env ruby
# frozen_string_literal: true

require "pathname"
require "yaml"

root = Pathname.new(__dir__).parent.realpath
inputs = ARGV.empty? ? Dir[root.join(".agents/skills/*/SKILL.md")] : ARGV
errors = []
seen_names = {}

if inputs.empty?
  warn "no SKILL.md files found"
  exit 1
end

inputs.sort.each do |input|
  path = Pathname.new(input)
  path = root.join(path) unless path.absolute?

  unless path.file?
    errors << "#{path}: file does not exist"
    next
  end

  text = path.read
  match = text.match(/\A---\s*\n(.*?)\n---\s*\n/m)
  unless match
    errors << "#{path}: missing leading YAML frontmatter"
    next
  end

  begin
    metadata = YAML.safe_load(match[1], permitted_classes: [], aliases: false)
  rescue Psych::SyntaxError => e
    errors << "#{path}: invalid YAML frontmatter (#{e.problem})"
    next
  end

  unless metadata.is_a?(Hash)
    errors << "#{path}: frontmatter must be a mapping"
    next
  end

  name = metadata["name"]
  description = metadata["description"]
  folder_name = path.dirname.basename.to_s

  unless name.is_a?(String) && name.match?(/\A[a-z0-9]+(?:-[a-z0-9]+)*\z/)
    errors << "#{path}: name must use lowercase letters, digits, and internal hyphens"
  end
  errors << "#{path}: name must match folder #{folder_name.inspect}" if name != folder_name
  unless description.is_a?(String) && !description.strip.empty?
    errors << "#{path}: description must be a non-empty string"
  end

  if name.is_a?(String) && seen_names.key?(name)
    errors << "#{path}: duplicate skill name also used by #{seen_names[name]}"
  else
    seen_names[name] = path
  end

  # Keep the check for explicit unfinished markers. `Todo` is a valid
  # project/harness object name and must not be confused with `TODO`.
  if text.match?(/\b(?:TODO|TBD|PLACEHOLDER)\b/)
    errors << "#{path}: contains unfinished placeholder text"
  end

  text.scan(/\[[^\]]*\]\(([^)]+)\)/).flatten.each do |target|
    clean = target.strip.sub(/\A</, "").sub(/>\z/, "")
    next if clean.empty? || clean.start_with?("#", "http://", "https://", "mailto:")

    relative = clean.split("#", 2).first
    next if relative.empty?

    linked = path.dirname.join(relative).cleanpath
    errors << "#{path}: broken local link #{clean.inspect}" unless linked.exist?
  end
end

if errors.empty?
  puts "validated #{inputs.length} skill#{inputs.length == 1 ? "" : "s"}"
  exit 0
end

warn errors.join("\n")
exit 1
