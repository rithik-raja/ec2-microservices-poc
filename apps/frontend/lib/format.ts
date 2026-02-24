export function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function userInitial(name: string) {
  const safe = name.trim();
  return safe ? safe[0].toUpperCase() : "?";
}
