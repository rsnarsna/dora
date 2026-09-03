'use client';

import React, { useMemo } from 'react';
import { RawJiraIssue, JiraTaskNode } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ResponsiveFunnel } from '@nivo/funnel';
import { ResponsiveSunburst } from '@nivo/sunburst';
import { ResponsiveNetwork } from '@nivo/network';
import { Network, Filter, PieChart } from 'lucide-react';

interface AdvancedAnalyticsProps {
  tasks: RawJiraIssue[];
  hierarchy: JiraTaskNode[];
}

export const AdvancedAnalytics: React.FC<AdvancedAnalyticsProps> = ({ tasks, hierarchy }) => {
  
  // 1. Funnel Data (Process Flow)
  const funnelData = useMemo(() => {
    const counts = { 'To Do': 0, 'In Progress': 0, 'REVIEW': 0, 'Done': 0 };
    tasks.forEach(t => {
      const st = t.status || 'To Do';
      if (st in counts) {
        counts[st as keyof typeof counts]++;
      } else if (st === 'on-hold') {
        counts['In Progress']++; // Merge on-hold into In Progress for funnel
      }
    });

    // Funnel expects sequential data. For tasks, usually everything starts as To Do. 
    // To make a proper funnel shape, each step should be smaller.
    // In a project, Total Tasks -> Started (In Progress + Review + Done) -> In Review (Review + Done) -> Done
    const done = counts['Done'];
    const review = counts['REVIEW'] + done;
    const inProgress = counts['In Progress'] + review;
    const total = counts['To Do'] + inProgress;

    return [
      { id: 'Total Tasks', value: total, label: 'Total Tasks' },
      { id: 'Started', value: inProgress, label: 'Started' },
      { id: 'In Review', value: review, label: 'In Review' },
      { id: 'Done', value: done, label: 'Done' }
    ];
  }, [tasks]);

  // 2. Sunburst Data (Hierarchy)
  const sunburstData = useMemo(() => {
    return {
      name: 'All Tasks',
      children: hierarchy.map(epic => ({
        name: epic.key,
        children: epic.children.length > 0 
          ? epic.children.map(story => ({ name: story.key, value: 1 }))
          : [{ name: epic.key + " (Task)", value: 1 }]
      }))
    };
  }, [hierarchy]);

  // 3. Network Data (Node links)
  const networkData = useMemo(() => {
    const nodes: any[] = [{ id: 'Project Root', radius: 14, color: 'hsl(var(--primary))' }];
    const links: any[] = [];

    hierarchy.forEach(epic => {
      nodes.push({ id: epic.key, radius: 9, color: 'hsl(var(--destructive))' });
      links.push({ source: 'Project Root', target: epic.key, distance: 60 });

      epic.children.forEach(story => {
        nodes.push({ id: story.key, radius: 5, color: 'hsl(var(--secondary))' });
        links.push({ source: epic.key, target: story.key, distance: 40 });
      });
    });

    return { nodes, links };
  }, [hierarchy]);

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            🔬 Deep Analysis Graphs
          </CardTitle>
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Powered by @nivo</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="network" className="w-full">
          <div className="border-b border-border px-4 py-2 bg-muted/30">
            <TabsList className="h-8">
              <TabsTrigger value="network" className="text-xs flex items-center gap-1.5"><Network className="w-3.5 h-3.5"/> Task Network</TabsTrigger>
              <TabsTrigger value="funnel" className="text-xs flex items-center gap-1.5"><Filter className="w-3.5 h-3.5"/> Process Funnel</TabsTrigger>
              <TabsTrigger value="sunburst" className="text-xs flex items-center gap-1.5"><PieChart className="w-3.5 h-3.5"/> Hierarchy Sunburst</TabsTrigger>
            </TabsList>
          </div>

          <div className="h-[400px] w-full p-4 relative">
            {/* NETWORK TAB */}
            <TabsContent value="network" className="h-full w-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
              <ResponsiveNetwork
                data={networkData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                linkDistance={(e: any) => e.distance}
                centeringStrength={0.3}
                repulsivity={20}
                nodeSize={(n: any) => n.radius}
                activeNodeSize={(n: any) => n.radius * 1.5}
                nodeColor={(e: any) => e.color}
                nodeBorderWidth={1}
                nodeBorderColor={{ from: 'color', modifiers: [['darker', 0.8]] }}
                linkThickness={2}
                linkColor="hsl(var(--border))"
              />
            </TabsContent>

            {/* FUNNEL TAB */}
            <TabsContent value="funnel" className="h-full w-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
              <ResponsiveFunnel
                data={funnelData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                valueFormat=">-.0f"
                colors={{ scheme: 'spectral' }}
                borderWidth={20}
                labelColor={{ from: 'color', modifiers: [['darker', 3]] }}
                beforeSeparatorLength={100}
                beforeSeparatorOffset={20}
                afterSeparatorLength={100}
                afterSeparatorOffset={20}
                currentPartSizeExtension={10}
                currentBorderWidth={40}
                motionConfig="wobbly"
              />
            </TabsContent>

            {/* SUNBURST TAB */}
            <TabsContent value="sunburst" className="h-full w-full m-0 data-[state=active]:block data-[state=inactive]:hidden">
              <ResponsiveSunburst
                data={sunburstData}
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                id="name"
                value="value"
                cornerRadius={2}
                borderWidth={1}
                borderColor="white"
                colors={{ scheme: 'nivo' }}
                childColor={{ from: 'color', modifiers: [['brighter', 0.1]] }}
                enableArcLabels={true}
                arcLabelsSkipAngle={10}
                arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 1.4]] }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
