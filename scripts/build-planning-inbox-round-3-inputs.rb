#!/usr/bin/env ruby

require "digest"
require "fileutils"

root = File.expand_path("..", __dir__)
payload_dir = File.join(root, "evals/skill-evaluation/payloads/planning-inbox-round-2")
snapshot_dir = File.join(root, "evals/skill-evaluation/snapshots")
output_dir = File.join(root, "evals/skill-evaluation/inputs/planning-inbox-round-3")

expected_snapshots = {
  "old" => ["planning-inbox-round-2.md", "b74cddb8c79c9b99ed2bfb8d8f4c39aa6610728ec32fbddf8eb4d096dd06f87e"],
  "new" => ["planning-inbox-round-3.md", "53c4adaddfd5703d6bbaf05ad7a1d655a1c6280046730f68f1b84bba5bd5c79e"]
}.freeze
expected_payloads = {
  "A" => "d920d43f4a7c3562d9de1583793ea48891c3ccf97d8ca149e169d63d6b863078",
  "B" => "9a60494a01b5f0a0d3aba64eb956096a43e69f920dda19bb04590ad9a16768b4",
  "C" => "f9574a759a6a42d8c361916c20d04a7905670d1573e658889803752ace936f8b",
  "D" => "37ae8a6e87fc640667022892f0f0f221226cef85fe88c0da599e5071feaef56e",
  "E" => "13458edde1ccc248ae98ef208722d801489515d52253a2133df019713a59e497"
}.freeze

def verified_read(path, expected)
  bytes = File.binread(path)
  actual = Digest::SHA256.hexdigest(bytes)
  abort("hash mismatch: #{path}: expected #{expected}, got #{actual}") unless actual == expected
  bytes
end

snapshots = expected_snapshots.to_h do |arm, (filename, expected_hash)|
  [arm, verified_read(File.join(snapshot_dir, filename), expected_hash)]
end
FileUtils.mkdir_p(output_dir)

expected_payloads.each do |item, expected_hash|
  payload = verified_read(File.join(payload_dir, "#{item}.md"), expected_hash)

  snapshots.each do |arm, snapshot|
    input = <<~PREFIX.b + snapshot + "\n# 本轮 runner payload\n\n".b + payload
      # 本轮唯一额外加载的候选 skill snapshot

      仅在下面的 runner payload 中应用一次这个候选 skill。不要读取或推断任何未提供的
      theory、research、fixture、manifest、review、另一 snapshot 或其他 skill。

    PREFIX

    path = File.join(output_dir, "#{item}-#{arm}.md")
    File.binwrite(path, input)
    puts [item, arm, Digest::SHA256.hexdigest(input), path].join("\t")
  end
end
