'use client';

import React, { useState } from 'react';
import { KnowledgeCluster } from '@/types/knowledge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X, FolderPlus } from 'lucide-react';

interface KnowledgeClusterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCluster: (name: string, description: string, color: string) => void;
}

const COLOR_PRESETS = ['#0052cc', '#6554c0', '#00875a', '#ff5630', '#ff8b00', '#00b8d9', '#e56910', '#36b37e'];

export const KnowledgeClusterModal: React.FC<KnowledgeClusterModalProps> = ({
  isOpen,
  onClose,
  onCreateCluster,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#0052cc');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreateCluster(name.trim(), description.trim(), color);
    setName('');
    setDescription('');
    setColor('#0052cc');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-primary/10 text-primary">
              <FolderPlus className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-foreground">Create Knowledge Cluster</h3>
              <p className="text-xs text-muted-foreground">
                Group existing concepts into a multi-context perspective.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Cluster Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Splunk Monitoring, Q3 Strategy"
              autoFocus
              required
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1">
              Description (Optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or objective of this cluster..."
              className="text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
              Cluster Accent Color
            </label>
            <div className="flex items-center gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-white ring-2 ring-primary/50' : 'border-transparent opacity-80 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!name.trim()}>
              Create Cluster
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
