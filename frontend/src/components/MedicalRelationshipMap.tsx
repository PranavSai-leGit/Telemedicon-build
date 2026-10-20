import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Pill,
  FlaskConical,
  FileText,
  AlertTriangle,
  Eye,
  CheckCircle2,
  Calendar,
  Activity,
  Layers,
  Info,
  ShieldAlert,
  ArrowRight,
  GitBranch,
  Clock,
  Compass,
  ChevronRight,
  Maximize2,
  Check,
  TrendingUp,
  X,
  PlusCircle,
  MinusCircle,
  HelpCircle,
  SlidersHorizontal,
  FolderOpen,
  Archive,
  RefreshCw,
  Sparkles,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { GraphNode, GraphEdge, RelationshipGraphResponse, FactConfidenceDetail } from '../types';
import { EvidenceModal } from './EvidenceModal';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ConfidenceInspectorModal } from './ConfidenceInspectorModal';
import { LabTrendModal } from './LabTrendModal';
import { Pagination } from './Pagination';
import { api } from '../services/api';

interface MedicalRelationshipMapProps {
  graphData: RelationshipGraphResponse | null;
  loading?: boolean;
  onJumpToTimeline?: (factId: number) => void;
  onInspectDocument?: (documentId: number) => void;
  patientId?: number;
  onRefreshGraph?: () => Promise<void>;
}

export type ClinicalGraphViewMode =
  | 'tree'
  | 'overview'
  | 'condition_centered'
  | 'medication_centered'
  | 'lab_centered'
  | 'timeline';

export const MedicalRelationshipMap: React.FC<MedicalRelationshipMapProps> = ({
  graphData,
  loading = false,
  onJumpToTimeline,
  onInspectDocument,
  patientId,
  onRefreshGraph,
}) => {
  // Navigation & View Mode state (Tree is default as requested)
  const [viewMode, setViewMode] = useState<ClinicalGraphViewMode>('tree');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Tree Root Condition selection
  const [selectedRootConditionId, setSelectedRootConditionId] = useState<string | null>(null);

  // Node Selection & Expansion state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_only' | 'inactive_only'>('all');
  const [abnormalityFilter, setAbnormalityFilter] = useState<'all' | 'abnormal_only' | 'normal_only'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Left sidebar tab: 'records' | 'archive'
  const [sidebarTab, setSidebarTab] = useState<'records' | 'archive'>('records');
  const [archiveSortOrder, setArchiveSortOrder] = useState<'desc' | 'asc'>('desc');

  // Sidebar records list pagination
  const [sidebarPage, setSidebarPage] = useState(1);
  const sidebarPageSize = 8;

  // Modals state
  const [evidenceData, setEvidenceData] = useState<any | null>(null);
  const [confidenceDetail, setConfidenceDetail] = useState<FactConfidenceDetail | null>(null);
  const [labTrendModalOpen, setLabTrendModalOpen] = useState(false);
  const [trendModalTarget, setTrendModalTarget] = useState<{ canonicalId?: string; testName?: string; documentId?: number }>({});
  const [archiveActionLoading, setArchiveActionLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Popup state for Expanded Tree representation
  const [isTreePopupOpen, setIsTreePopupOpen] = useState(false);
  const [popupZoom, setPopupZoom] = useState(0.85);
  const [popupPan, setPopupPan] = useState({ x: 0, y: 0 });
  const [popupIsDragging, setPopupIsDragging] = useState(false);
  const [popupDragStart, setPopupDragStart] = useState({ x: 0, y: 0 });
  const [popupShowInspector, setPopupShowInspector] = useState(true);
  const popupContainerRef = useRef<HTMLDivElement>(null);
  const [hasDragged, setHasDragged] = useState(false);

  // All condition nodes in graph
  const allConditions = useMemo(() => {
    if (!graphData) return [];
    return graphData.nodes.filter((n) => n.type === 'condition');
  }, [graphData]);

  // Expired / Archived conditions sorted chronologically
  const archivedConditions = useMemo(() => {
    if (!graphData) return [];
    const list = graphData.nodes.filter(
      (n) => n.type === 'condition' && (n.is_archived || !n.is_active || n.is_temporary)
    );
    return [...list].sort((a, b) => {
      const dateA = a.date || a.archived_date || '1970-01-01';
      const dateB = b.date || b.archived_date || '1970-01-01';
      return archiveSortOrder === 'desc'
        ? dateB.localeCompare(dateA)
        : dateA.localeCompare(dateB);
    });
  }, [graphData, archiveSortOrder]);

  // Default selection when graph loads
  useEffect(() => {
    if (graphData && graphData.nodes.length > 0) {
      if (!selectedRootConditionId) {
        const firstActiveCond = graphData.nodes.find((n) => n.type === 'condition' && n.is_active && !n.is_archived);
        const anyCond = graphData.nodes.find((n) => n.type === 'condition');
        const initialCondId = firstActiveCond?.id || anyCond?.id || graphData.nodes[0].id;
        setSelectedRootConditionId(initialCondId);
        if (!selectedNodeId) {
          setSelectedNodeId(initialCondId);
        }
      }
    }
  }, [graphData]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setSidebarPage(1);
  }, [searchQuery, filterType, statusFilter, abnormalityFilter, verificationFilter, dateFrom, dateTo]);

  // Mode change handler
  const handleViewModeChange = (mode: ClinicalGraphViewMode) => {
    setViewMode(mode);
    setExpandedNodeIds(new Set());
    setZoom(1);
    setPan({ x: 0, y: 0 });

    if (!graphData) return;

    if (mode === 'tree' || mode === 'condition_centered') {
      const cond = graphData.nodes.find((n) => n.id === selectedRootConditionId) ||
        graphData.nodes.find((n) => n.type === 'condition' && n.is_active) ||
        graphData.nodes.find((n) => n.type === 'condition');
      if (cond) {
        setSelectedRootConditionId(cond.id);
        setSelectedNodeId(cond.id);
      }
    } else if (mode === 'medication_centered') {
      const med = graphData.nodes.find((n) => n.type === 'medication' && n.is_active) || graphData.nodes.find((n) => n.type === 'medication');
      if (med) setSelectedNodeId(med.id);
    } else if (mode === 'lab_centered') {
      const lab = graphData.nodes.find((n) => (n.type === 'lab_result' || n.type === 'vital') && n.is_abnormal) || graphData.nodes.find((n) => n.type === 'lab_result');
      if (lab) setSelectedNodeId(lab.id);
    }
  };

  // Toggle node expansion
  const toggleExpandNode = (nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // Reset viewport
  const handleResetView = () => {
    setZoom(0.85);
    setPan({ x: 0, y: 0 });
    setPopupZoom(0.85);
    setPopupPan({ x: 0, y: 0 });
    setExpandedNodeIds(new Set());
    setSearchQuery('');
    setFilterType('all');
    setStatusFilter('all');
    setAbnormalityFilter('all');
    setVerificationFilter('all');
    setDateFrom('');
    setDateTo('');
    if (graphData && selectedRootConditionId) {
      setSelectedNodeId(selectedRootConditionId);
    }
  };

  // Inspect Ground-Truth Evidence Modal immediately
  const handleInspectEvidence = async (node: GraphNode) => {
    if (!node.id.startsWith('fact-')) {
      if (node.type === 'document' && node.document_id && onInspectDocument) {
        onInspectDocument(node.document_id);
      }
      return;
    }
    const factId = parseInt(node.id.replace('fact-', ''), 10);
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error('Failed to load fact evidence:', err);
    }
  };

  // Confidence Inspector
  const handleInspectConfidence = async (node: GraphNode) => {
    if (!node.id.startsWith('fact-')) return;
    const factId = parseInt(node.id.replace('fact-', ''), 10);
    try {
      const detail = await api.getFactConfidence(factId);
      setConfidenceDetail(detail);
    } catch (err) {
      console.error('Failed to load confidence detail:', err);
    }
  };

  // Open Lab Trend Chart Modal
  const handleOpenLabTrend = (node: GraphNode) => {
    setTrendModalTarget({
      canonicalId: node.canonical_id,
      testName: node.label,
      documentId: node.document_id,
    });
    setLabTrendModalOpen(true);
  };

  // Toggle Condition Archive (e.g. for expired fever)
  const handleToggleArchive = async (factId: number, currentlyArchived: boolean) => {
    setArchiveActionLoading(true);
    try {
      await api.archiveFact(factId, !currentlyArchived, currentlyArchived ? undefined : 'Temporary acute episode expired or marked resolved.');
      if (onRefreshGraph) {
        await onRefreshGraph();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Failed to toggle condition archive status:', err);
      alert(err.message || 'Failed to update condition archive status.');
    } finally {
      setArchiveActionLoading(false);
    }
  };

  // Node Click: "on clicking give the evidence"
  const handleNodeClick = async (node: GraphNode) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);

    // If a condition is clicked, set it as tree root
    if (node.type === 'condition') {
      setSelectedRootConditionId(node.id);
    }

    // Immediately inspect evidence on click as requested
    await handleInspectEvidence(node);
  };

  // Styling helper for Node types
  const getNodeColorConfig = (type: string, isAbnormal = false, isConflict = false, isArchived = false) => {
    if (isConflict) {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-300 dark:border-amber-700',
        accent: '#D97706',
        text: 'text-amber-900 dark:text-amber-200',
        badge: 'med-badge-warning',
        icon: AlertTriangle,
      };
    }
    if (isAbnormal) {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-300 dark:border-rose-700',
        accent: '#E11D48',
        text: 'text-rose-900 dark:text-rose-200',
        badge: 'med-badge-danger',
        icon: AlertTriangle,
      };
    }
    if (isArchived) {
      return {
        bg: 'bg-amber-50/60 dark:bg-amber-950/20',
        border: 'border-amber-300/80 dark:border-amber-800',
        accent: '#B45309',
        text: 'text-amber-800 dark:text-amber-300',
        badge: 'med-badge-neutral',
        icon: Clock,
      };
    }

    switch (type) {
      case 'condition':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/40',
          border: 'border-blue-200 dark:border-blue-800',
          accent: '#2563EB',
          text: 'text-blue-900 dark:text-blue-200',
          badge: 'med-badge-blue',
          icon: Activity,
        };
      case 'medication':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/40',
          border: 'border-teal-200 dark:border-teal-800',
          accent: '#0F766E',
          text: 'text-teal-900 dark:text-teal-200',
          badge: 'med-badge-teal',
          icon: Pill,
        };
      case 'lab_result':
      case 'vital':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/40',
          border: 'border-emerald-200 dark:border-emerald-800',
          accent: '#059669',
          text: 'text-emerald-900 dark:text-emerald-200',
          badge: 'med-badge-green',
          icon: FlaskConical,
        };
      case 'document':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40',
          border: 'border-purple-200 dark:border-purple-800',
          accent: '#7C3AED',
          text: 'text-purple-900 dark:text-purple-200',
          badge: 'med-badge-neutral',
          icon: FileText,
        };
      default:
        return {
          bg: 'bg-neutral-50 dark:bg-neutral-900',
          border: 'border-neutral-200 dark:border-neutral-800',
          accent: '#64748B',
          text: 'text-neutral-800 dark:text-neutral-200',
          badge: 'med-badge-neutral',
          icon: Layers,
        };
    }
  };

  // Main computation for visible nodes, tree structure, layout positions, and connectivity
  const {
    visibleNodes,
    visibleEdges,
    nodePositions,
    connectedNodeIds,
    connectedEdgeIds,
    allFilteredNodes,
    paginatedSidebarNodes,
    totalSidebarRecords,
    treeStructure,
  } = useMemo(() => {
    if (!graphData || !graphData.nodes.length) {
      return {
        visibleNodes: [],
        visibleEdges: [],
        nodePositions: new Map<string, { x: number; y: number }>(),
        connectedNodeIds: new Set<string>(),
        connectedEdgeIds: new Set<string>(),
        allFilteredNodes: [],
        paginatedSidebarNodes: [],
        totalSidebarRecords: 0,
        treeStructure: null,
      };
    }

    // 1. Filter ALL nodes based on user search and filters
    const filteredNodes = graphData.nodes.filter((node) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchLabel = node.label.toLowerCase().includes(q);
        const matchCat = node.category.toLowerCase().includes(q);
        const matchDoc = node.document_name?.toLowerCase().includes(q);
        const matchVal = JSON.stringify(node.details).toLowerCase().includes(q);
        if (!matchLabel && !matchCat && !matchDoc && !matchVal) return false;
      }
      if (filterType !== 'all' && node.type !== filterType) return false;
      if (statusFilter === 'active_only' && (!node.is_active || node.is_archived)) return false;
      if (statusFilter === 'inactive_only' && node.is_active && !node.is_archived) return false;
      if (abnormalityFilter === 'abnormal_only' && !node.is_abnormal) return false;
      if (abnormalityFilter === 'normal_only' && node.is_abnormal) return false;
      if (verificationFilter === 'verified' && node.verification_status !== 'clinician_verified' && node.verification_status !== 'verified') return false;
      if (verificationFilter === 'unverified' && (node.verification_status === 'clinician_verified' || node.verification_status === 'verified')) return false;
      if (dateFrom && node.date && node.date < dateFrom) return false;
      if (dateTo && node.date && node.date > dateTo) return false;
      return true;
    });

    const positions = new Map<string, { x: number; y: number }>();
    let targetVisibleIds = new Set<string>();
    let customTreeEdges: GraphEdge[] = [];
    let treeData: any = null;

    if (viewMode === 'tree') {
      // ==========================================
      // TREE VIEW MODE: User-Selected Condition as Root Node
      // ==========================================
      const rootConditionNode =
        graphData.nodes.find((n) => n.id === selectedRootConditionId) ||
        graphData.nodes.find((n) => n.type === 'condition' && n.is_active) ||
        graphData.nodes.find((n) => n.type === 'condition') ||
        graphData.nodes[0];

      targetVisibleIds.add(rootConditionNode.id);

      // Find all direct 1-hop connections from graph edges
      const directlyConnectedIds = new Set<string>();
      graphData.edges.forEach((e) => {
        if (e.source === rootConditionNode.id) directlyConnectedIds.add(e.target);
        if (e.target === rootConditionNode.id) directlyConnectedIds.add(e.source);
      });

      // Also gather facts sharing the same source document if direct edges are sparse
      const rootDocId = rootConditionNode.document_id;
      const coDocumentedIds = new Set<string>();
      if (rootDocId) {
        graphData.nodes.forEach((n) => {
          if (n.document_id === rootDocId && n.id !== rootConditionNode.id) {
            coDocumentedIds.add(n.id);
          }
        });
      }

      // Group into canonical clinical branches
      const branchMeds: GraphNode[] = [];
      const branchLabs: GraphNode[] = [];
      const branchDocs: GraphNode[] = [];
      const branchOthers: GraphNode[] = [];

      graphData.nodes.forEach((n) => {
        if (n.id === rootConditionNode.id) return;
        const isLinked = directlyConnectedIds.has(n.id) || coDocumentedIds.has(n.id);
        if (!isLinked && directlyConnectedIds.size > 0) return; // Keep clean focus if edges exist

        if (n.type === 'medication') branchMeds.push(n);
        else if (n.type === 'lab_result' || n.type === 'vital') branchLabs.push(n);
        else if (n.type === 'document') branchDocs.push(n);
        else if (n.type === 'condition' || n.type === 'allergy') branchOthers.push(n);
      });

      // If document node isn't present, make sure root document is included
      if (rootDocId && !branchDocs.some((d) => d.id === `doc-${rootDocId}`)) {
        const docNode = graphData.nodes.find((n) => n.id === `doc-${rootDocId}`);
        if (docNode) branchDocs.push(docNode);
      }

      // Add all to visible IDs
      branchMeds.forEach((n) => targetVisibleIds.add(n.id));
      branchLabs.forEach((n) => targetVisibleIds.add(n.id));
      branchDocs.forEach((n) => targetVisibleIds.add(n.id));
      branchOthers.forEach((n) => targetVisibleIds.add(n.id));

      // Calculate Tree Coordinates (Horizontal hierarchical tree: Root Left -> Categories -> Leaves Right)
      const rootX = 140;
      const branchHubX = 480;
      const leafX = 840;

      // Calculate total vertical height
      const totalLeaves = Math.max(1, branchMeds.length + branchLabs.length + branchDocs.length + branchOthers.length);
      const rowGap = 88;
      const totalHeight = Math.max(650, totalLeaves * rowGap);
      const rootY = totalHeight / 2;

      // Root position
      positions.set(rootConditionNode.id, { x: rootX, y: rootY });

      let currentLeafY = 60;
      const branchHubs: Array<{ id: string; label: string; type: string; color: string; x: number; y: number; leafCount: number }> = [];

      const layoutBranch = (items: GraphNode[], branchKey: string, branchLabel: string, color: string, relLabel: string) => {
        if (items.length === 0) return;
        const startY = currentLeafY;
        items.forEach((item) => {
          positions.set(item.id, { x: leafX, y: currentLeafY });
          currentLeafY += rowGap;

          // Connect category hub to leaf
          customTreeEdges.push({
            id: `tree-edge-${branchKey}-${item.id}`,
            source: branchKey,
            target: item.id,
            label: relLabel,
            relationship_type: branchKey,
            relationship_nature: directlyConnectedIds.has(item.id) ? 'explicit_documented' : 'inferred',
            status: item.verification_status,
          });
        });

        const midBranchY = (startY + (currentLeafY - rowGap)) / 2;
        positions.set(branchKey, { x: branchHubX, y: midBranchY });
        branchHubs.push({
          id: branchKey,
          label: branchLabel,
          type: branchKey,
          color,
          x: branchHubX,
          y: midBranchY,
          leafCount: items.length,
        });

        // Connect Root to category hub
        customTreeEdges.push({
          id: `tree-edge-root-${branchKey}`,
          source: rootConditionNode.id,
          target: branchKey,
          label: branchLabel,
          relationship_type: branchKey,
          relationship_nature: 'explicit_documented',
          status: 'verified',
        });
      };

      layoutBranch(branchMeds, 'branch-meds', 'Medications & Treatments', '#0F766E', 'Treats / Manages');
      layoutBranch(branchLabs, 'branch-labs', 'Laboratory Biomarkers', '#059669', 'Monitors / Diagnoses');
      layoutBranch(branchDocs, 'branch-docs', 'Supporting Documents', '#7C3AED', 'Documented In');
      layoutBranch(branchOthers, 'branch-others', 'Related Symptoms & History', '#2563EB', 'Associated With');

      treeData = {
        rootNode: rootConditionNode,
        branchHubs,
        branchCounts: {
          meds: branchMeds.length,
          labs: branchLabs.length,
          docs: branchDocs.length,
          others: branchOthers.length,
        },
      };
    } else if (viewMode === 'timeline') {
      // Horizontal Timeline Layout
      const sorted = [...filteredNodes].filter((n) => n.type !== 'document').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      sorted.slice(0, 16).forEach((n) => targetVisibleIds.add(n.id));
      if (selectedNodeId) targetVisibleIds.add(selectedNodeId);

      const visSorted = filteredNodes.filter((n) => targetVisibleIds.has(n.id));
      visSorted.forEach((node, idx) => {
        const x = 120 + idx * 240;
        const y = 320 + (idx % 2 === 0 ? -90 : 90);
        positions.set(node.id, { x, y });
      });
    } else if (viewMode === 'condition_centered' || viewMode === 'medication_centered' || viewMode === 'lab_centered') {
      // Radial layout
      const centerNode = graphData.nodes.find((n) => n.id === selectedNodeId) || graphData.nodes[0];
      targetVisibleIds.add(centerNode.id);
      graphData.edges.forEach((e) => {
        if (e.source === centerNode.id) targetVisibleIds.add(e.target);
        if (e.target === centerNode.id) targetVisibleIds.add(e.source);
      });

      const centerX = 500;
      const centerY = 340;
      positions.set(centerNode.id, { x: centerX, y: centerY });

      const neighbors = graphData.nodes.filter((n) => n.id !== centerNode.id && targetVisibleIds.has(n.id));
      const radius = 240;
      const angleStep = neighbors.length > 0 ? (2 * Math.PI) / neighbors.length : 0;
      neighbors.forEach((node, idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.set(node.id, { x, y });
      });
    } else {
      // Clinical Overview Layout: 3 Columns
      const overviewBase = graphData.overview_node_ids && graphData.overview_node_ids.length > 0
        ? graphData.overview_node_ids
        : graphData.nodes.slice(0, 10).map((n) => n.id);
      overviewBase.forEach((id) => targetVisibleIds.add(id));
      if (selectedNodeId) targetVisibleIds.add(selectedNodeId);

      const vis = graphData.nodes.filter((n) => targetVisibleIds.has(n.id));
      const conditions = vis.filter((n) => n.type === 'condition');
      const medsAndLabs = vis.filter((n) => n.type === 'medication' || n.type === 'lab_result' || n.type === 'vital');
      const docsAndOthers = vis.filter((n) => n.type === 'document' || n.type === 'allergy');

      const placeColumn = (items: GraphNode[], xCol: number, yStart = 100, yGap = 130) => {
        items.forEach((item, index) => {
          positions.set(item.id, { x: xCol, y: yStart + index * yGap });
        });
      };

      placeColumn(conditions, 160, 120, 140);
      placeColumn(medsAndLabs, 500, 100, 130);
      placeColumn(docsAndOthers, 840, 120, 140);
    }

    // Visible nodes & edges
    const visNodes = graphData.nodes.filter((n) => targetVisibleIds.has(n.id));
    const visNodeIdSet = new Set(visNodes.map((n) => n.id));

    let visEdges = graphData.edges.filter(
      (e) => visNodeIdSet.has(e.source) && visNodeIdSet.has(e.target)
    );

    if (viewMode === 'tree') {
      visEdges = customTreeEdges;
    }

    // Connectivity map
    const connNodeIds = new Set<string>();
    const connEdgeIds = new Set<string>();

    if (selectedNodeId) {
      connNodeIds.add(selectedNodeId);
      visEdges.forEach((e) => {
        if (e.source === selectedNodeId) {
          connNodeIds.add(e.target);
          connEdgeIds.add(e.id);
        } else if (e.target === selectedNodeId) {
          connNodeIds.add(e.source);
          connEdgeIds.add(e.id);
        }
      });
    }

    // Pagination for sidebar
    const startIdx = (sidebarPage - 1) * sidebarPageSize;
    const paginatedSidebar = filteredNodes.slice(startIdx, startIdx + sidebarPageSize);

    return {
      visibleNodes: visNodes,
      visibleEdges: visEdges,
      nodePositions: positions,
      connectedNodeIds: connNodeIds,
      connectedEdgeIds: connEdgeIds,
      allFilteredNodes: filteredNodes,
      paginatedSidebarNodes: paginatedSidebar,
      totalSidebarRecords: filteredNodes.length,
      treeStructure: treeData,
    };
  }, [
    graphData,
    viewMode,
    selectedRootConditionId,
    selectedNodeId,
    expandedNodeIds,
    searchQuery,
    filterType,
    statusFilter,
    abnormalityFilter,
    verificationFilter,
    dateFrom,
    dateTo,
    sidebarPage,
  ]);

  // Selected Node & Edge details
  const selectedNode = useMemo(() => {
    if (!graphData || !selectedNodeId) return null;
    return graphData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [graphData, selectedNodeId]);

  const selectedEdge = useMemo(() => {
    if (!graphData || !selectedEdgeId) return null;
    return visibleEdges.find((e) => e.id === selectedEdgeId) || null;
  }, [graphData, selectedEdgeId, visibleEdges]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isTreePopupOpen) {
          setIsTreePopupOpen(false);
        } else {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTreePopupOpen]);

  // Shared SVG Canvas Renderer (used for both bottom container and expanded popup modal)
  const renderSvgCanvas = (
    svgZoom: number,
    svgPan: { x: number; y: number },
    svgIsDragging: boolean,
    onNodeSelect: (node: GraphNode) => void,
    isModalView = false
  ) => {
    return (
      <svg
        className="w-full h-full pointer-events-auto"
        style={{
          transform: `translate(${svgPan.x}px, ${svgPan.y}px) scale(${svgZoom})`,
          transformOrigin: 'center center',
          transition: svgIsDragging ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        <defs>
          <marker id="arrow-teal" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#0F766E" />
          </marker>
          <marker id="arrow-slate" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
          </marker>
          <filter id="glow-tree-root" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 1. EDGES / TREE BRANCH CONNECTORS */}
        {visibleEdges.map((edge) => {
          const srcPos = nodePositions.get(edge.source);
          const tgtPos = nodePositions.get(edge.target);
          if (!srcPos || !tgtPos) return null;

          const isSelectedEdge = edge.id === selectedEdgeId;
          const isTree = viewMode === 'tree';

          // Smooth cubic bezier curved branch for tree hierarchy
          const deltaX = tgtPos.x - srcPos.x;
          const pathD = isTree
            ? `M ${srcPos.x + 36} ${srcPos.y} C ${srcPos.x + deltaX * 0.5} ${srcPos.y}, ${srcPos.x + deltaX * 0.5} ${tgtPos.y}, ${tgtPos.x - 36} ${tgtPos.y}`
            : `M ${srcPos.x} ${srcPos.y} L ${tgtPos.x} ${tgtPos.y}`;

          const midX = (srcPos.x + tgtPos.x) / 2;
          const midY = (srcPos.y + tgtPos.y) / 2;

          let strokeColor = '#CBD5E1';
          if (isSelectedEdge) strokeColor = '#0F766E';
          else if (edge.relationship_type === 'branch-meds') strokeColor = '#0F766E';
          else if (edge.relationship_type === 'branch-labs') strokeColor = '#059669';
          else if (edge.relationship_type === 'branch-docs') strokeColor = '#7C3AED';
          else if (edge.relationship_type === 'branch-others') strokeColor = '#2563EB';

          return (
            <g
              key={`edge-${edge.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedEdgeId(edge.id);
              }}
              className="cursor-pointer group"
            >
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isSelectedEdge ? 3 : isTree ? 2 : 1.5}
                opacity={0.8}
                className="transition-colors group-hover:stroke-teal-600"
              />
              {/* Branch label */}
              {isTree && edge.label && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x="-38"
                    y="-9"
                    width="76"
                    height="18"
                    rx="5"
                    fill="#FFFFFF"
                    stroke={strokeColor}
                    strokeWidth="1"
                    className="dark:fill-slate-800"
                  />
                  <text
                    textAnchor="middle"
                    y="3"
                    fontSize="8.5"
                    fontWeight="600"
                    fill={strokeColor}
                    className="pointer-events-none select-none font-sans"
                  >
                    {edge.label.length > 14 ? `${edge.label.substring(0, 12)}..` : edge.label}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* 2. CATEGORY BRANCH HUBS (in Tree Mode) */}
        {viewMode === 'tree' &&
          treeStructure?.branchHubs?.map((hub: any) => {
            const pos = nodePositions.get(hub.id);
            if (!pos) return null;
            return (
              <g key={`hub-${hub.id}`} transform={`translate(${pos.x}, ${pos.y})`}>
                <rect
                  x="-85"
                  y="-22"
                  width="170"
                  height="44"
                  rx="12"
                  fill="#FFFFFF"
                  stroke={hub.color}
                  strokeWidth="2.5"
                  className="shadow-md dark:fill-slate-900"
                />
                <text
                  textAnchor="middle"
                  y="-2"
                  fontSize="11"
                  fontWeight="bold"
                  fill={hub.color}
                  className="select-none pointer-events-none"
                >
                  {hub.label}
                </text>
                <text
                  textAnchor="middle"
                  y="14"
                  fontSize="9"
                  fill="#64748B"
                  className="select-none pointer-events-none"
                >
                  {hub.leafCount} connected {hub.leafCount === 1 ? 'branch' : 'branches'}
                </text>
              </g>
            );
          })}

        {/* 3. NODES (Root Condition, Leaves, Items) */}
        {visibleNodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isSelected = node.id === selectedNodeId;
          const isRoot = node.id === selectedRootConditionId;
          const colorCfg = getNodeColorConfig(node.type, node.is_abnormal, false, node.is_archived);
          const IconComp = colorCfg.icon;

          return (
            <g
              key={`node-${node.id}`}
              transform={`translate(${pos.x}, ${pos.y})`}
              onClick={(e) => {
                e.stopPropagation();
                onNodeSelect(node);
              }}
              className="cursor-pointer transition-transform duration-150 ease-out group"
            >
              {/* Root Glow & Distinct Styling */}
              {isRoot && (
                <circle
                  r="48"
                  fill="none"
                  stroke="#0F766E"
                  strokeWidth="3.5"
                  strokeDasharray="5,5"
                  className="animate-spin-slow opacity-75"
                />
              )}

              {/* Selection Ring */}
              {isSelected && !isRoot && (
                <circle
                  r="36"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeDasharray="4,4"
                  className="animate-spin-slow"
                />
              )}

              {/* Main Node Circle */}
              <circle
                r={isRoot ? 38 : 28}
                fill="#FFFFFF"
                stroke={isRoot ? '#0F766E' : isSelected ? '#2563EB' : colorCfg.accent}
                strokeWidth={isRoot ? 3.5 : isSelected ? 3 : 2}
                className="shadow-md group-hover:scale-105 transition-transform dark:fill-slate-900"
              />

              {/* Inner Node Icon */}
              <g transform={isRoot ? 'translate(-12, -12)' : 'translate(-9, -9)'}>
                <IconComp className={isRoot ? 'w-6 h-6' : 'w-4.5 h-4.5'} style={{ color: colorCfg.accent }} />
              </g>

              {/* Root Tag Badge */}
              {isRoot && (
                <g transform="translate(0, -48)">
                  <rect x="-38" y="-10" width="76" height="20" rx="6" fill="#0F766E" />
                  <text textAnchor="middle" y="4" fontSize="9" fontWeight="bold" fill="#FFFFFF">
                    TREE ROOT
                  </text>
                </g>
              )}

              {/* Node Label Text */}
              <text
                textAnchor="middle"
                y={isRoot ? '56' : '44'}
                fontSize={isRoot ? '12' : '11'}
                fontWeight="bold"
                fill="#0F172A"
                className="dark:fill-slate-100 pointer-events-none select-none"
              >
                {node.label.length > 22 ? `${node.label.substring(0, 20)}...` : node.label}
              </text>

              {/* Subtext (Abnormality, date, or expired status) */}
              <text
                textAnchor="middle"
                y={isRoot ? '70' : '57'}
                fontSize="9.5"
                fill={node.is_archived ? '#B45309' : node.is_abnormal ? '#E11D48' : '#64748B'}
                className="pointer-events-none select-none font-medium"
              >
                {node.is_archived
                  ? '⏱️ Expired / Archived'
                  : node.is_abnormal
                  ? `Abnormal (${node.abnormality_status})`
                  : node.category}
              </text>

              {/* Quick 1-Click Evidence Badge */}
              {node.id.startsWith('fact-') && (
                <g
                  transform={isRoot ? 'translate(26, -26)' : 'translate(20, -20)'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInspectEvidence(node);
                  }}
                >
                  <title>Click to open ground-truth source evidence excerpt</title>
                  <circle r="10" fill="#0F766E" className="shadow-xs hover:scale-125 transition-transform" />
                  <text textAnchor="middle" y="3" fontSize="8" fontWeight="bold" fill="#FFFFFF">
                    EV
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    );
  };

  // Shared Provenance / Evidence Inspector Content Renderer
  const renderNodeInspectorContent = (node: GraphNode, onClose?: () => void) => {
    return (
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-3 gap-2">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                {node.category || node.type}
              </span>
              {node.is_archived && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Expired Condition
                </span>
              )}
              {node.is_abnormal && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                  Abnormal Result
                </span>
              )}
            </div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              {node.label}
            </h4>
            {node.date && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Calendar className="w-3 h-3" />
                <span>{node.date}</span>
              </div>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Expired / Temporary Condition Banner */}
        {node.is_archived && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
              <Clock className="w-4 h-4" />
              <span>Archived Temporary Condition</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {node.archive_reason || 'Temporary condition (such as acute fever or infection) expired after standard clinical resolution timeframe.'}
            </p>
          </div>
        )}

        {/* Ground-Truth Source Excerpt */}
        {node.source_excerpt && (
          <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-900/40 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 font-bold">
              <span>Source Excerpt Verification</span>
              <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 px-1.5 py-0.5 rounded">
                Page {node.source_page || 1}
              </span>
            </div>
            <blockquote className="text-[11px] text-slate-800 dark:text-slate-200 font-mono italic leading-relaxed">
              "{node.source_excerpt}"
            </blockquote>
            {node.document_name && (
              <div className="pt-1 text-[10px] text-slate-500 truncate">
                File: {node.document_name}
              </div>
            )}
          </div>
        )}

        {/* Confidence & Verification Status */}
        {node.confidence_score !== undefined && (
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Evidence Confidence</span>
              <ConfidenceBadge
                score={node.confidence_score}
                label={node.confidence_label as any}
                onClick={() => handleInspectConfidence(node)}
              />
            </div>
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  node.confidence_score >= 80
                    ? 'bg-teal-500'
                    : node.confidence_score >= 60
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${node.confidence_score}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          {/* 1. Inspect Ground-Truth Evidence */}
          {node.id.startsWith('fact-') && (
            <button
              onClick={() => handleInspectEvidence(node)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Inspect Ground-Truth Evidence Modal</span>
            </button>
          )}

          {/* 2. Set as Tree Root Condition (if condition) */}
          {node.type === 'condition' && (
            <button
              onClick={() => {
                setSelectedRootConditionId(node.id);
                setViewMode('tree');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 text-teal-800 dark:text-teal-200 font-semibold text-xs transition-colors cursor-pointer"
            >
              <GitBranch className="w-4 h-4 text-teal-600" />
              <span>Re-root Hierarchy Tree on "{node.label}"</span>
            </button>
          )}

          {/* 3. Archive / Restore Condition Toggle */}
          {node.type === 'condition' && node.id.startsWith('fact-') && (
            <button
              disabled={archiveActionLoading}
              onClick={() => {
                const factId = parseInt(node.id.replace('fact-', ''), 10);
                handleToggleArchive(factId, Boolean(node.is_archived));
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-800 dark:text-amber-200 font-medium text-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {node.is_archived
                  ? 'Restore Condition to Active'
                  : 'Archive Condition (Mark Expired/Resolved)'}
              </span>
            </button>
          )}

          {/* 4. Laboratory Trend Chart (if lab test) */}
          {(node.type === 'lab_result' || node.type === 'vital') && (
            <button
              onClick={() => handleOpenLabTrend(node)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Plot Laboratory Longitudinal Trend</span>
            </button>
          )}

          {/* 5. Open Medical Record File */}
          {node.document_id && onInspectDocument && (
            <button
              onClick={() => onInspectDocument(node.document_id!)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium text-xs transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5 text-purple-600" />
              <span>Open Medical Record PDF / Image</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col space-y-6 select-none">
      {/* =========================================================================
          SECTION 1: TWO TOP CONTAINERS (Side-by-Side, no longer squeezing the tree!)
          Container 1: Records & Expired Archive Explorer (with Search & Filters)
          Container 2: Provenance & Clinical Evidence Inspector (Selected Entity)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CONTAINER 1: RECORDS & ARCHIVE EXPLORER */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-[520px] overflow-hidden">
          {/* Header Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs font-semibold">
            <button
              onClick={() => setSidebarTab('records')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                sidebarTab === 'records'
                  ? 'border-teal-600 text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Documented Records ({totalSidebarRecords})</span>
            </button>
            <button
              onClick={() => setSidebarTab('archive')}
              className={`flex-1 py-3 px-4 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                sidebarTab === 'archive'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-300 bg-white dark:bg-slate-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Archive className="w-3.5 h-3.5 text-amber-600" />
              <span>Expired Archive ({archivedConditions.length})</span>
            </button>
          </div>

          {/* Search & Filter Strip */}
          <div className="px-4 py-2.5 bg-slate-50/40 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search records..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">All Types</option>
              <option value="condition">Conditions</option>
              <option value="medication">Medications</option>
              <option value="lab_result">Lab Results</option>
              <option value="vital">Vitals</option>
              <option value="document">Documents</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active_only">Active Only</option>
              <option value="inactive_only">Expired / Inactive</option>
            </select>
          </div>

          {/* Tab 1: Records */}
          {sidebarTab === 'records' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {paginatedSidebarNodes.map((node) => {
                  const isSelected = node.id === selectedNodeId;
                  const isRoot = node.id === selectedRootConditionId;
                  const colorCfg = getNodeColorConfig(node.type, node.is_abnormal, false, node.is_archived);
                  const IconComp = colorCfg.icon;

                  return (
                    <div
                      key={`sidebar-${node.id}`}
                      onClick={() => handleNodeClick(node)}
                      className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 shadow-xs ring-1 ring-teal-500'
                          : 'border-slate-200/70 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white truncate">
                          <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: colorCfg.accent }} />
                          <span className="truncate">{node.label}</span>
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {isRoot && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-teal-600 text-white">
                              Tree Root
                            </span>
                          )}
                          {node.is_archived && !isRoot && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              Expired
                            </span>
                          )}
                          {node.is_abnormal && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                              ABN
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="capitalize">{node.type.replace('_', ' ')}</span>
                        <span>{node.date || 'No date'}</span>
                      </div>
                    </div>
                  );
                })}

                {paginatedSidebarNodes.length === 0 && (
                  <div className="py-16 text-center text-xs text-slate-400">
                    No documented records matching your criteria.
                  </div>
                )}
              </div>

              {totalSidebarRecords > sidebarPageSize && (
                <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                  <Pagination
                    currentPage={sidebarPage}
                    totalPages={Math.ceil(totalSidebarRecords / sidebarPageSize)}
                    pageSize={sidebarPageSize}
                    totalRecords={totalSidebarRecords}
                    onPageChange={setSidebarPage}
                  />
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Archive */}
          {sidebarTab === 'archive' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                  Chronological Order ({archiveSortOrder === 'desc' ? 'Newest First' : 'Oldest First'})
                </span>
                <button
                  onClick={() => setArchiveSortOrder((s) => (s === 'desc' ? 'asc' : 'desc'))}
                  className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-[10px] font-bold text-amber-800 dark:text-amber-300"
                >
                  {archiveSortOrder === 'desc' ? '⬇ Newest' : '⬆ Oldest'}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
                {archivedConditions.length > 0 ? (
                  archivedConditions.map((cond) => {
                    const isRoot = cond.id === selectedRootConditionId;
                    return (
                      <div
                        key={`archive-${cond.id}`}
                        className={`p-3 rounded-xl border text-xs space-y-2 transition-all ${
                          isRoot
                            ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 ring-1 ring-teal-500'
                            : 'border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 hover:bg-amber-50/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{cond.label}</span>
                            </span>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              {cond.is_temporary ? 'Temporary Condition (Expired)' : 'Historical / Resolved'}
                            </span>
                          </div>
                          {isRoot && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-teal-600 text-white shrink-0">
                              Active Tree Root
                            </span>
                          )}
                        </div>

                        {cond.archive_reason && (
                          <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 italic leading-snug">
                            Reason: {cond.archive_reason}
                          </p>
                        )}

                        <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                          <div>Event Date: {cond.date || 'Unrecorded'}</div>
                          {cond.archived_date && <div>Archived / Expired: {cond.archived_date}</div>}
                          {cond.document_name && <div className="truncate">Source: {cond.document_name}</div>}
                        </div>

                        <div className="pt-1 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRootConditionId(cond.id);
                              setSelectedNodeId(cond.id);
                              setViewMode('tree');
                            }}
                            className="flex-1 py-1 px-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-[10px] flex items-center justify-center gap-1 transition-colors"
                          >
                            <GitBranch className="w-3 h-3" />
                            <span>Set as Tree Root</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInspectEvidence(cond)}
                            className="py-1 px-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-[10px] font-medium flex items-center gap-1"
                            title="Inspect ground-truth clinical source excerpt"
                          >
                            <Eye className="w-3 h-3 text-teal-600" />
                            <span>Evidence</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 opacity-60" />
                    <p>No expired temporary conditions currently archived.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* CONTAINER 2: PROVENANCE & CLINICAL EVIDENCE INSPECTOR */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col h-[520px] overflow-hidden">
          <div className="p-3.5 px-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Compass className="w-4 h-4 text-teal-600" />
              <div>
                <h3 className="font-bold text-xs text-slate-900 dark:text-white">
                  Provenance & Clinical Evidence Inspector
                </h3>
                <p className="text-[10px] text-slate-400">
                  Source document excerpts, confidence scores, and provenance
                </p>
              </div>
            </div>
            {selectedNode && (
              <button
                onClick={() => setSelectedNodeId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Deselect"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {selectedNode ? (
              renderNodeInspectorContent(selectedNode, () => setSelectedNodeId(null))
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <Compass className="w-6 h-6 opacity-80" />
                </div>
                <h4 className="font-bold text-xs text-slate-700 dark:text-slate-300">
                  No Entity Currently Selected
                </h4>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  Select any record from the left explorer or click any node in the hierarchy tree below to inspect evidence provenance, confidence breakdown, and source documents.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: TREE REPRESENTATION AS A SEPARATE CONTAINER AT THE BOTTOM!
          (Not squeezed in between the other two containers!)
         ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        {/* Tree Header Bar */}
        <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50/70 dark:bg-slate-900/70 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                <GitBranch className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Clinical Hierarchy Tree Representation
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    Separate Container
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Click anywhere on the tree representation to open in an expanded popup view
                </p>
              </div>
            </div>

            {/* Root Condition Selector */}
            {viewMode === 'tree' && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-700">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Root:
                </span>
                <select
                  value={selectedRootConditionId || ''}
                  onChange={(e) => {
                    setSelectedRootConditionId(e.target.value);
                    setSelectedNodeId(e.target.value);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 font-bold text-xs text-teal-900 dark:text-teal-200 shadow-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <optgroup label="Active Clinical Conditions">
                    {allConditions
                      .filter((c) => c.is_active && !c.is_archived)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          🟢 {c.label} {c.date ? `(${c.date})` : ''}
                        </option>
                      ))}
                  </optgroup>
                  {allConditions.some((c) => c.is_archived || !c.is_active) && (
                    <optgroup label="Archived / Expired Conditions">
                      {allConditions
                        .filter((c) => c.is_archived || !c.is_active)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            ⏱️ {c.label} [Expired] {c.date ? `(${c.date})` : ''}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Controls, Counts, and Expand Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Modes Selector */}
            <div className="hidden md:flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <button
                onClick={() => handleViewModeChange('tree')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'tree'
                    ? 'bg-teal-600 text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Tree
              </button>
              <button
                onClick={() => handleViewModeChange('overview')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'overview'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => handleViewModeChange('condition_centered')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'condition_centered'
                    ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Radial
              </button>
              <button
                onClick={() => handleViewModeChange('timeline')}
                className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                  viewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Timeline
              </button>
            </div>

            {/* Branch Counts */}
            {viewMode === 'tree' && (
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mr-1">
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span> 💊 Meds: {treeStructure?.branchCounts?.meds ?? 0}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> 🧪 Labs: {treeStructure?.branchCounts?.labs ?? 0}
                </span>
                <span className="flex items-center gap-1 font-medium">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> 📄 Docs: {treeStructure?.branchCounts?.docs ?? 0}
                </span>
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
                title="Reset View"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent Expand Button */}
            <button
              onClick={() => setIsTreePopupOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-xs transition-all cursor-pointer"
              title="Open expanded full-screen popup"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Expand Tree View</span>
            </button>
          </div>
        </div>

        {/* Tree Canvas (Clicking opens expanded popup!) */}
        <div
          ref={containerRef}
          onMouseDown={(e) => {
            if (e.button === 0) {
              setIsDragging(true);
              setHasDragged(false);
              setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }
          }}
          onMouseMove={(e) => {
            if (isDragging) {
              setHasDragged(true);
              setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onMouseUp={() => {
            if (isDragging && !hasDragged) {
              setIsTreePopupOpen(true);
            }
            setIsDragging(false);
          }}
          onMouseLeave={() => setIsDragging(false)}
          className="h-[420px] relative overflow-hidden bg-dot-pattern cursor-pointer bg-slate-50/50 dark:bg-slate-950 group"
          title="Click to open expanded tree representation popup"
        >
          {/* Floating overlay to expand into popup */}
          <div className="absolute top-3 right-3 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsTreePopupOpen(true);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-teal-500/40 text-teal-700 dark:text-teal-300 shadow-md text-xs font-semibold flex items-center gap-1.5 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-all cursor-pointer group-hover:scale-105"
            >
              <Maximize2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Click to Open Expanded Popup</span>
            </button>
          </div>

          {/* Canvas SVG */}
          {renderSvgCanvas(zoom, pan, isDragging, (node) => {
            handleNodeClick(node);
            setIsTreePopupOpen(true);
          })}

          {/* Quick Help Overlay */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2 pointer-events-none shadow-xs">
            <Info className="w-3.5 h-3.5 text-teal-600" />
            <span>Click anywhere on tree representation to open expanded popup view.</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: EXPANDED POPUP MODAL (When clicked on the tree representation)
         ========================================================================= */}
      {isTreePopupOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
          <div className="w-full h-full max-w-[97vw] max-h-[95vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-3 sm:px-5 sm:py-3.5 bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  <GitBranch className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Clinical Hierarchy Tree Representation — Expanded View
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      Interactive Canvas
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Drag to pan, scroll to zoom, click any node to inspect evidence provenance
                  </p>
                </div>

                {/* Root Condition Selector in Modal */}
                {viewMode === 'tree' && (
                  <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                      Root Condition:
                    </span>
                    <select
                      value={selectedRootConditionId || ''}
                      onChange={(e) => {
                        setSelectedRootConditionId(e.target.value);
                        setSelectedNodeId(e.target.value);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 font-bold text-xs text-teal-900 dark:text-teal-200 shadow-xs focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <optgroup label="Active Clinical Conditions">
                        {allConditions
                          .filter((c) => c.is_active && !c.is_archived)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              🟢 {c.label} {c.date ? `(${c.date})` : ''}
                            </option>
                          ))}
                      </optgroup>
                      {allConditions.some((c) => c.is_archived || !c.is_active) && (
                        <optgroup label="Archived / Expired Conditions">
                          {allConditions
                            .filter((c) => c.is_archived || !c.is_active)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                ⏱️ {c.label} [Expired] {c.date ? `(${c.date})` : ''}
                              </option>
                            ))}
                        </optgroup>
                      )}
                    </select>
                  </div>
                )}
              </div>

              {/* Modal Controls */}
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPopupZoom((z) => Math.min(2.5, z + 0.15))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPopupZoom((z) => Math.max(0.3, z - 0.15))}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setPopupZoom(0.85);
                      setPopupPan({ x: 0, y: 0 });
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                    title="Reset View"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Toggle Inspector Panel */}
                <button
                  onClick={() => setPopupShowInspector(!popupShowInspector)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    popupShowInspector
                      ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{popupShowInspector ? 'Hide Evidence Panel' : 'Show Evidence Panel'}</span>
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsTreePopupOpen(false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>Close (Esc)</span>
                </button>
              </div>
            </div>

            {/* Modal Canvas + Inspector Area */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* SVG Canvas */}
              <div
                ref={popupContainerRef}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    setPopupIsDragging(true);
                    setPopupDragStart({ x: e.clientX - popupPan.x, y: e.clientY - popupPan.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (popupIsDragging) {
                    setPopupPan({ x: e.clientX - popupDragStart.x, y: e.clientY - popupDragStart.y });
                  }
                }}
                onMouseUp={() => setPopupIsDragging(false)}
                onMouseLeave={() => setPopupIsDragging(false)}
                onWheel={(e) => {
                  e.preventDefault();
                  const delta = e.deltaY > 0 ? -0.1 : 0.1;
                  setPopupZoom((z) => Math.min(2.5, Math.max(0.3, z + delta)));
                }}
                className="flex-1 relative overflow-hidden bg-dot-pattern cursor-grab active:cursor-grabbing bg-slate-50/50 dark:bg-slate-950"
              >
                {renderSvgCanvas(popupZoom, popupPan, popupIsDragging, (node) => {
                  handleNodeClick(node);
                }, true)}
              </div>

              {/* Collapsible Inspector Drawer inside Modal */}
              {popupShowInspector && selectedNode && (
                <div className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto">
                  {renderNodeInspectorContent(selectedNode, () => setPopupShowInspector(false))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />

      {/* Confidence Breakdown Modal */}
      <ConfidenceInspectorModal
        confidenceDetail={confidenceDetail}
        isOpen={Boolean(confidenceDetail)}
        onClose={() => setConfidenceDetail(null)}
      />

      {/* Laboratory Trend Chart Modal */}
      <LabTrendModal
        isOpen={labTrendModalOpen}
        onClose={() => setLabTrendModalOpen(false)}
        canonicalId={trendModalTarget.canonicalId}
        testName={trendModalTarget.testName}
        documentId={trendModalTarget.documentId}
        patientId={patientId}
      />
    </div>
  );
};
