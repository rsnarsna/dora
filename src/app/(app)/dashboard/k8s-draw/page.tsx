'use client';

export default function K8sDrawPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] w-full relative">
      <iframe
        src="/k8sgames/draw.html"
        className="w-full h-full border-0"
        title="K8s Architecture Draw"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
