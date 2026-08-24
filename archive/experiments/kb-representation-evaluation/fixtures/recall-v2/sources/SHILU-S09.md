# SHILU-S09

AnchorId: an_98b0
// ValidateEntry validates required fields on an Entry.
func ValidateEntry(e Entry, actor Actor) error {
	if e.Title == "" || e.Kind == "" {
		return ErrInvalidFrontmatter
	}
	if !ValidEntryKinds[e.Kind] {
		return ErrInvalidKind
	}
	switch e.Confidence {
	case ConfidenceHigh, ConfidenceMedium, ConfidenceLow:
	default:
		return ErrInvalidConfidence
	}
	if actor != ActorHuman && len(e.Sources) == 0 {
		return ErrMissingProvenance
	}
	return nil
}
