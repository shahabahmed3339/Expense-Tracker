export function groupBy<T, K extends string>(
  items: T[],
  getKey: (item: T) => K,
) {
  return items.reduce<Record<K, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}
