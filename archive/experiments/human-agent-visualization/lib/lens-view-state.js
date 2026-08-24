export function applySourceOnlyMode({ sourceOnly, comparisonEnabled }) {
  return {
    sourceOnly,
    comparisonEnabled: sourceOnly ? false : comparisonEnabled,
  };
}

export function comparisonPresentationState({
  sourceOnly,
  comparisonEnabled,
  comparisonAvailable,
}) {
  const controlVisible = !sourceOnly && comparisonAvailable;
  return {
    controlVisible,
    cuesVisible: controlVisible && comparisonEnabled,
  };
}
