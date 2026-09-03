import { RawJiraIssue, JiraTaskNode } from '@/types';

export function buildJiraHierarchy(issues: RawJiraIssue[]): JiraTaskNode[] {
  const issueMap = new Map<string, JiraTaskNode>();
  
  // 1. Convert all issues to TaskNodes with empty children arrays
  issues.forEach((issue) => {
    issueMap.set(issue.key, {
      ...issue,
      children: [],
      _is_sprint: issue.in_active_sprint || false,
      _is_backlog: !issue.in_active_sprint,
    });
  });

  const roots: JiraTaskNode[] = [];
  const orphanStories: JiraTaskNode[] = [];

  // 2. Attach children to parents, creating placeholder Epics if missing
  Array.from(issueMap.values()).forEach((node) => {
    if (node.parent_key) {
      if (issueMap.has(node.parent_key)) {
        const parent = issueMap.get(node.parent_key)!;
        parent.children.push(node);
      } else {
        // Create synthetic epic for missing parent
        const syntheticEpic: JiraTaskNode = {
          id: node.parent_key,
          key: node.parent_key,
          title: `${node.parent_key} (Epic not fetched)`,
          start_date: '',
          official_deadline: '',
          status: 'To Do',
          priority: 'Medium',
          issue_type: 'Epic',
          assignee: 'Unknown',
          reporter: 'Unknown',
          children: [node],
          _is_sprint: false,
          _is_backlog: true,
        };
        issueMap.set(node.parent_key, syntheticEpic);
        roots.push(syntheticEpic);
      }
    } else {
      if (node.issue_type === 'Epic') {
        roots.push(node);
      } else {
        orphanStories.push(node);
      }
    }
  });

  // 3. Group orphan stories under a synthetic Folder if any exist
  if (orphanStories.length > 0) {
    roots.push({
      id: 'FOLDER-ORPHANS',
      key: 'UNGROUPED',
      title: 'Ungrouped Tasks & Stories',
      start_date: '',
      official_deadline: '',
      status: 'In Progress',
      priority: 'None',
      issue_type: 'Folder',
      assignee: 'Various',
      reporter: 'System',
      children: orphanStories,
      _is_sprint: false,
      _is_backlog: true,
    });
  }

  return roots;
}

export function calculateBufferDays(officialDeadline: string, selfTarget: string): number {
  if (!officialDeadline || officialDeadline === 'Not Set' || !selfTarget || selfTarget === 'Not Set') {
    return 0;
  }
  const dOfficial = new Date(officialDeadline).getTime();
  const dTarget = new Date(selfTarget).getTime();
  if (isNaN(dOfficial) || isNaN(dTarget)) return 0;
  return Math.round((dOfficial - dTarget) / (1000 * 60 * 60 * 24));
}
