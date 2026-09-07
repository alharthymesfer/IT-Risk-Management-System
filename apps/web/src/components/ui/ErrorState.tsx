import { AlertCircle } from 'lucide-react';

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-10 text-center">
      <AlertCircle className="h-6 w-6 text-red-500" aria-hidden="true" />
      <p className="text-sm font-medium text-red-700">{message}</p>
    </div>
  );
}
