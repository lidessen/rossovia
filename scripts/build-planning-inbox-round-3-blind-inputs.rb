#!/usr/bin/env ruby

require "digest"
require "fileutils"

root = File.expand_path("..", __dir__)
run_dir = File.join(root, "evals/skill-evaluation/runs/planning-inbox-round-3")
output_dir = File.join(root, "evals/skill-evaluation/reviews/blind-inputs/planning-inbox-round-3")

expected_outputs = {
  "A" => {
    "old" => "9445673855353f7844abeda69f105c062071ddfc3c35e5996297acb582926c44",
    "new" => "5b27c8bd5b0f70677815e053747ccd2261149292df1e51dde2ddcfa30e61f56b"
  },
  "B" => {
    "old" => "33bd4b3cc1b8e0faefda5ca4d361e6344f8457831a77edc1f03134ed92ee6e43",
    "new" => "a9020a65fb6c62d766b08c001c7fc9b0637eee5b774dd148d7f51b28b4a3f3fe"
  },
  "C" => {
    "old" => "3b5913db92c6cf8ef4e83a8d9324ea5991e9f0a824bcb740a2930d71e468f11d",
    "new" => "6714de2a3a0608dd4046aa8ffe0dfe276807b29a0fa05f91c66dbfc20e293523"
  },
  "D" => {
    "old" => "285df59140af5f32dd38b9a86614eb6b1b415a091912b133e155570305a501d6",
    "new" => "2b31099e594c9a9fb18e78aa93a0cbfb5f409cd5e1d12b760a14c36ff3ad3c25"
  },
  "E" => {
    "old" => "e48b260a2fb10e6706dc89b8bb5fe61aab21ee4583bcc53db77fa7c381b8054a",
    "new" => "694e608df0c8d9f59155c31f7a97b0408606a1eaa02441b2207e56ea7ea53fd2"
  }
}.freeze

# 交替映射只用于抵消固定 X/Y 位置偏差；reviewer 不读取本脚本。
mapping = {
  "A" => ["new", "old"],
  "B" => ["old", "new"],
  "C" => ["new", "old"],
  "D" => ["old", "new"],
  "E" => ["new", "old"]
}.freeze

def verified_read(path, expected)
  bytes = File.binread(path)
  actual = Digest::SHA256.hexdigest(bytes)
  abort("hash mismatch: #{path}: expected #{expected}, got #{actual}") unless actual == expected
  bytes
end

FileUtils.mkdir_p(output_dir)

mapping.each do |item, (x_arm, y_arm)|
  x = verified_read(File.join(run_dir, "#{item}-#{x_arm}.md"), expected_outputs.fetch(item).fetch(x_arm))
  y = verified_read(File.join(run_dir, "#{item}-#{y_arm}.md"), expected_outputs.fetch(item).fetch(y_arm))
  pair = "# PI-R3-#{item} blind pair\n\n## Output X\n\n".b + x +
    "\n\n## Output Y\n\n".b + y
  path = File.join(output_dir, "#{item}.md")
  File.binwrite(path, pair)
  puts [item, Digest::SHA256.hexdigest(pair), path].join("\t")
end
