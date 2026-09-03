'use client';

export default function K8sLabPage() {
  return (
    <div className="h-[calc(100vh-3.5rem)] w-full relative">
      <iframe
        src="/k8sgames/index.html"
        className="w-full h-full border-0"
        title="K8s Practice Lab"
        allow="fullscreen"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
      />
    </div>
  );
}
