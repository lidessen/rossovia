// DigestRequest contains all the context needed for a digest-source operation.
// The processor gathers this from the job queue, source registry, and catalog
// before calling AgentProvider.DigestSource.
type DigestRequest struct {
	// Source is the raw source record being processed.
	Source types.Source `yaml:"source" json:"source"`

	// RawContent is the full text content of the source, extracted by the
	// normalizer for the source's format type.
	RawContent string `yaml:"rawContent" json:"rawContent"`

	// Collection is the target collection name for extracted entries.
	// Determined by the source's workspace field or a configured default.
	Collection string `yaml:"collection" json:"collection"`

	// CollectionCfg is the configuration for the target collection.
	// The provider uses this to determine extraction policy (review strictness,
	// default tags, etc.).
	CollectionCfg *types.CollectionConfig `yaml:"collectionCfg,omitempty" json:"collectionCfg,omitempty"`

	// RelatedEntries are existing entries in the target collection that may
	// relate to the source content. The provider uses these for deduplication
	// and linking decisions.
	RelatedEntries []types.Entry `yaml:"relatedEntries,omitempty" json:"relatedEntries,omitempty"`
}

// DigestResult contains the proposed operations from a digest-source run.
// The processor validates these through Core.CommitOperations and creates
// review items for low-confidence results.
type DigestResult struct {
	// Operations are the structured operations (create, update, link, supersede)
	// proposed by the provider. Each operation should have appropriate provenance
	// and confidence.
	Operations []types.Operation `yaml:"operations" json:"operations"`

	// ReviewItems capture uncertainty: low-confidence extractions, possible
	// duplicates, or proposed supersessions that need human review.
	ReviewItems []types.ReviewItem `yaml:"reviewItems,omitempty" json:"reviewItems,omitempty"`
}
