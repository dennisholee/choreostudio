const PAST_TENSE_SUFFIXES = [
  'ed',
  'Created',
  'Updated',
  'Deleted',
  'Placed',
  'Completed',
  'Failed',
  'Received',
  'Sent',
  'Approved',
  'Rejected',
  'Cancelled',
] as const;

export function checkPastTense(label: string): { valid: boolean; message: string } {
  if (!label || label.length === 0) {
    return { valid: true, message: '' };
  }

  const isPastTense = PAST_TENSE_SUFFIXES.some((suffix) => label.endsWith(suffix));

  return {
    valid: isPastTense,
    message: isPastTense
      ? ''
      : `Domain Events should be past tense (e.g. "${label}Placed" or "${label}Created")`,
  };
}
