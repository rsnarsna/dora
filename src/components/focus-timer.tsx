'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface SessionLog {
  mins: number;
  timeStr: string;
}

export const FocusTimer: React.FC = () => {
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [modeLabel, setModeLabel] = useState('Focus');
  const [customInput, setCustomInput] = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(25);
  const [sessions, setSessions] = useState<SessionLog[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const CIRCUMFERENCE = 2 * Math.PI * 70; // r=70

  const updateDisplay = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progress = totalSeconds > 0 ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
  const dashOffset = CIRCUMFERENCE * (1 - progress);

  let ringColor = '#0052cc';
  if (progress > 0.8) ringColor = '#de350b';
  else if (progress > 0.5) ringColor = '#ff8b00';

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            setModeLabel('Done!');
            const completedMins = Math.floor(totalSeconds / 60);
            logSession(completedMins);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, totalSeconds]);

  const logSession = (mins: number) => {
    const d = new Date();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSessions((prev) => [{ mins, timeStr }, ...prev]);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setRemainingSeconds(totalSeconds);
    setModeLabel(totalSeconds / 60 <= 5 ? 'Break' : 'Focus');
  };

  const handlePreset = (mins: number) => {
    setIsRunning(false);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    setActivePreset(mins);
    setModeLabel(mins <= 5 ? 'Break' : 'Focus');
    setCustomInput('');
  };

  const handleCustomSet = () => {
    const mins = parseInt(customInput, 10);
    if (isNaN(mins) || mins <= 0) return;
    setIsRunning(false);
    setTotalSeconds(mins * 60);
    setRemainingSeconds(mins * 60);
    setActivePreset(null);
    setModeLabel('Focus');
  };

  return (
    <Card className="flex flex-col shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          ⏱️ Focus Timer
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center">
        {/* Ring Animation */}
        <div className="relative flex justify-center items-center my-2">
          <svg width="160" height="160" viewBox="0 0 160 160" className="transform -rotate-90">
            <circle cx="80" cy="80" r="70" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={ringColor}
              strokeWidth="10"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-3xl font-extrabold text-foreground tracking-tight">
              {updateDisplay(remainingSeconds)}
            </div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">
              {modeLabel}
            </div>
          </div>
        </div>

        {/* Timer Controls */}
        <div className="flex justify-center gap-2 w-full mb-4">
          <Button
            size="sm"
            onClick={toggleTimer}
            variant={isRunning ? "destructive" : "default"}
          >
            {isRunning ? '⏸ Pause' : '▶ Start'}
          </Button>
          <Button
            size="sm"
            onClick={resetTimer}
            variant="outline"
          >
            ↻ Reset
          </Button>
        </div>

        {/* Presets */}
        <div className="flex justify-center flex-wrap gap-1.5 w-full mb-3">
          {[25, 15, 5, 45].map((mins) => (
            <Button
              key={mins}
              variant={activePreset === mins ? "default" : "outline"}
              size="sm"
              className="h-7 text-[10px] px-2"
              onClick={() => handlePreset(mins)}
            >
              {mins === 5 ? '5m Break' : `${mins}m`}
            </Button>
          ))}
        </div>

        {/* Custom Duration Input */}
        <div className="flex justify-center items-center gap-2 w-full mb-4">
          <Input
            type="number"
            min="1"
            max="180"
            placeholder="Custom min"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSet()}
            className="w-24 h-8 text-xs text-center"
          />
          <Button size="sm" onClick={handleCustomSet} className="h-8">
            Set
          </Button>
        </div>

        {/* Session History Log */}
        <div className="w-full pt-3 border-t border-border">
          <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
            Session Log
          </div>
          <ScrollArea className="h-16 w-full">
            {sessions.length > 0 ? (
              <div className="space-y-1 pr-2">
                {sessions.map((s, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-0.5 border-b border-border last:border-0">
                    <span>
                      Completed <Badge variant="secondary" className="px-1 py-0 text-[10px]">{s.mins}m</Badge> session
                    </span>
                    <span className="text-muted-foreground text-[10px]">{s.timeStr}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="italic text-muted-foreground text-[11px]">No sessions completed yet</div>
            )}
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
