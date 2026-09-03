'use client';

import React, { useState, useEffect } from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

const TODO_STORAGE_KEY = 'dashboard_todos_v2';

export const QuickTodo: React.FC = () => {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(TODO_STORAGE_KEY);
      if (saved) setTodos(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to load todos from localStorage:', e);
    }
  }, []);

  const saveTodos = (newTodos: TodoItem[]) => {
    setTodos(newTodos);
    try {
      localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(newTodos));
    } catch (e) {
      console.error('Failed to save todos:', e);
    }
  };

  const handleAdd = () => {
    const text = inputText.trim();
    if (!text) return;
    const newItem: TodoItem = {
      id: Date.now().toString(),
      text,
      done: false,
    };
    saveTodos([...todos, newItem]);
    setInputText('');
  };

  const handleToggle = (id: string) => {
    const updated = todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
    saveTodos(updated);
  };

  const handleDelete = (id: string) => {
    saveTodos(todos.filter((t) => t.id !== id));
  };

  const completedCount = todos.filter((t) => t.done).length;
  const pct = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;

  return (
    <Card className="flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            ✅ Quick To-Do
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">(saved locally)</span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col justify-between">
        {/* Todo Items List */}
        <ScrollArea className="h-48 w-full mb-3 border rounded-md p-2">
          {todos.length > 0 ? (
            <div className="space-y-1.5">
              {todos.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 rounded border border-border hover:bg-muted transition-colors group"
                >
                  <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={() => handleToggle(item.id)}
                    />
                    <span
                      className={`text-xs text-foreground/90 truncate ${
                        item.done ? 'line-through text-muted-foreground' : ''
                      }`}
                    >
                      {item.text}
                    </span>
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-xs italic text-muted-foreground py-3 border border-dashed border-border rounded">
              No tasks yet. Add one below!
            </div>
          )}
        </ScrollArea>

        <div>
          {/* Add Row */}
          <div className="flex gap-2 mb-2">
            <Input
              type="text"
              placeholder="Add a quick task..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="h-8 text-xs"
            />
            <Button onClick={handleAdd} size="sm" className="h-8">
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>

          {/* Completion Progress Bar */}
          {todos.length > 0 && (
            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-medium">
              <span>
                <strong className="text-foreground/90">{completedCount}</strong> / {todos.length} completed
              </span>
              <span className="text-primary font-bold">{pct}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
