// Normalize validates a source and moves it to normalized status.
// In v0 this is intentionally simple; future versions may extract structured
// metadata, parse transcripts, or classify content.
func Normalize(s *types.Source) error {
	if s.ID == "" {
		return fmt.Errorf("source has no ID")
	}
	if s.Type == "" {
		return fmt.Errorf("source has no type")
	}
	if s.CapturedAt.IsZero() {
		s.CapturedAt = time.Now()
	}
	if s.Status == "" {
		s.Status = types.SourceStatusCaptured
	}
	// Verify raw file exists if a path is given
if s.RawPath != "" {
	if _, err := os.Stat(s.RawPath); err != nil {
		if os.IsNotExist(err) {
			return fmt.Errorf("raw source file not found: %s", s.RawPath)
		}
		return fmt.Errorf("check raw source file: %w", err)
	}
}
s.Status = types.SourceStatusNormalized
return nil
}

// StoreRaw copies raw source content into the Shilu source directory.
// Returns the destination path.
func StoreRaw(srcPath string, sType types.SourceType, layout interface {
	SourceDir(t types.SourceType) string
}) (string, error) {
	destDir := layout.SourceDir(sType)
	if err := os.MkdirAll(destDir, 0755); err != nil {
		return "", fmt.Errorf("create source directory: %w", err)
	}
	// Use the original filename if available; otherwise generate from timestamp
	base := filepath.Base(srcPath)
	if base == "." || base == "/" {
		base = fmt.Sprintf("source_%d.jsonl", time.Now().UnixNano())
	}
	destPath := filepath.Join(destDir, base)
	data, err := os.ReadFile(srcPath)
	if err != nil {
		return "", fmt.Errorf("read source file: %w", err)
	}
	if err := os.WriteFile(destPath, data, 0644); err != nil {
		return "", fmt.Errorf("write source file: %w", err)
	}
	return destPath, nil
}
