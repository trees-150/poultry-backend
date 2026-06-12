function formatUGX(value) {
  if (value === null || value === undefined) return value;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  // Use en-US thousands separator (comma)
  return `UGX ${num.toLocaleString('en-US')}`;
}

module.exports = { formatUGX };
