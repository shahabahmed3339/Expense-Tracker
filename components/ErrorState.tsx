export function ErrorState({ message }: { message?: string }) {
  return (
    <p className="text-red-400 text-sm py-6">
      {message ? message : "Something went wrong"}
    </p>
  );
}
