import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted p-6 text-center">
      <h1 className="text-4xl font-extrabold text-primary mb-2">404</h1>
      <h2 className="text-lg font-bold text-foreground/90 mb-4">Page Not Found</h2>
      <p className="text-xs text-muted-foreground mb-6">
        The task or page you are looking for does not exist in the dashboard hierarchy.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded transition-colors"
      >
        ← Return to Dashboard Overview
      </Link>
    </div>
  );
}
