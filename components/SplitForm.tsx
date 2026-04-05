type Person = { id: string; name: string };

export function SplitForm({ amount, people }: { amount: number; people: Person[] }) {
  const equal = people.length ? amount / people.length : 0;
  return (
    <div>
      {people.map((p) => (
        <div key={p.id}>
          {p.name}: {equal}
        </div>
      ))}
    </div>
  );
}
