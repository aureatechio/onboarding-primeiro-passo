export function getCopySource(copyVersion = 0) {
  return copyVersion > 0 ? `onboarding_copy:${copyVersion}` : 'copy.js';
}

export function createAcceptance(itemKey, itemText, metadata = {}, copySource = 'copy.js') {
  return {
    item_key: itemKey,
    item_text: String(itemText || '').trim(),
    accepted: true,
    copy_source: copySource,
    metadata,
  };
}

export function createAcceptances(itemKeys, itemTexts, metadata = {}, copySource = 'copy.js') {
  return itemTexts.map((text, index) =>
    createAcceptance(itemKeys[index], text, { ...metadata, order: index + 1 }, copySource)
  );
}
