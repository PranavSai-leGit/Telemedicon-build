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
  FolderOpen
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
}

export type ClinicalGraphViewMode =
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
}) => {
  // Navigation & View Mode state
  const [viewMode, setViewMode] = useState<ClinicalGraphViewMode>('overview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Node Selection & Expansion state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active_only' | 'inactive_only'>('all');
  const [abnormalityFilter, setAbnormalityFilter] = useState<'all' | 'abnormal_only' | 'normal_only'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sidebar records list pagination
  const [sidebarPage, setSidebarPage] = useState(1);
  const sidebarPageSize = 8;

  // Modals state
  const [evidenceData, setEvidenceData] = useState<any | null>(null);
  const [confidenceDetail, setConfidenceDetail] = useState<FactConfidenceDetail | null>(null);
  const [labTrendModalOpen, setLabTrendModalOpen] = useState(false);
  const [trendModalTarget, setTrendModalTarget] = useState<{ canonicalId?: string; testName?: string }>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Default selection when graph loads
  useEffect(() => {
    if (graphData && graphData.nodes.length > 0 && !selectedNodeId) {
      // Pick first active condition or first overview node
      const firstCond = graphData.nodes.find((n) => n.type === 'condition' && n.is_active);
      const initialId = firstCond?.id || graphData.overview_node_ids?.[0] || graphData.nodes[0].id;
      setSelectedNodeId(initialId);
    }
  }, [graphData]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setSidebarPage(1);
  }, [searchQuery, filterType, statusFilter, abnormalityFilter, verificationFilter, dateFrom, dateTo]);

  // Mode change handler: auto-adapt focused entity
  const handleViewModeChange = (mode: ClinicalGraphViewMode) => {
    setViewMode(mode);
    setExpandedNodeIds(new Set()); // reset lazy expansions to keep clean focus
    setZoom(1);
    setPan({ x: 0, y: 0 });

    if (!graphData) return;

    if (mode === 'condition_centered') {
      const cond = graphData.nodes.find((n) => n.type === 'condition' && n.is_active) || graphData.nodes.find((n) => n.type === 'condition');
      if (cond) setSelectedNodeId(cond.id);
    } else if (mode === 'medication_centered') {
      const med = graphData.nodes.find((n) => n.type === 'medication' && n.is_active) || graphData.nodes.find((n) => n.type === 'medication');
      if (med) setSelectedNodeId(med.id);
    } else if (mode === 'lab_centered') {
      const lab = graphData.nodes.find((n) => (n.type === 'lab_result' || n.type === 'vital') && n.is_abnormal) || graphData.nodes.find((n) => n.type === 'lab_result');
      if (lab) setSelectedNodeId(lab.id);
    }
  };

  // Lazy expansion toggle for a node
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

  // Reset view to default clinical overview
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setExpandedNodeIds(new Set());
    setSearchQuery('');
    setFilterType('all');
    setStatusFilter('all');
    setAbnormalityFilter('all');
    setVerificationFilter('all');
    setDateFrom('');
    setDateTo('');
    if (graphData && graphData.overview_node_ids && graphData.overview_node_ids.length > 0) {
      setSelectedNodeId(graphData.overview_node_ids[0]);
    }
  };

  // Evidence and Confidence inspectors
  const handleInspectEvidence = async (node: GraphNode) => {
    if (!node.id.startsWith('fact-')) return;
    const factId = parseInt(node.id.replace('fact-', ''), 10);
    try {
      const ev = await api.getFactEvidence(factId);
      setEvidenceData(ev);
    } catch (err) {
      console.error('Failed to load fact evidence:', err);
    }
  };

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

  const handleOpenLabTrend = (node: GraphNode) => {
    setTrendModalTarget({
      canonicalId: node.canonical_id,
      testName: node.label,
    });
    setLabTrendModalOpen(true);
  };

  // Styling helper for Node types
  const getNodeColorConfig = (type: string, isAbnormal = false, isConflict = false) => {
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

  // Main computation for visible nodes, layout positions, and connectivity
  const {
    visibleNodes,
    visibleEdges,
    nodePositions,
    connectedNodeIds,
    connectedEdgeIds,
    allFilteredNodes,
    paginatedSidebarNodes,
    totalSidebarRecords,
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
      };
    }

    // 1. Filter ALL nodes based on user search and filters (for the sidebar matching records list)
    const filteredNodes = graphData.nodes.filter((node) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchLabel = node.label.toLowerCase().includes(q);
        const matchCat = node.category.toLowerCase().includes(q);
        const matchDoc = node.document_name?.toLowerCase().includes(q);
        const matchVal = JSON.stringify(node.details).toLowerCase().includes(q);
        if (!matchLabel && !matchCat && !matchDoc && !matchVal) return false;
      }

      // Type filter
      if (filterType !== 'all' && node.type !== filterType) {
        return false;
      }

      // Status filter
      if (statusFilter === 'active_only' && !node.is_active) return false;
      if (statusFilter === 'inactive_only' && node.is_active) return false;

      // Abnormality filter
      if (abnormalityFilter === 'abnormal_only' && !node.is_abnormal) return false;
      if (abnormalityFilter === 'normal_only' && node.is_abnormal) return false;

      // Verification filter
      if (verificationFilter === 'verified' && node.verification_status !== 'clinician_verified' && node.verification_status !== 'verified') return false;
      if (verificationFilter === 'unverified' && (node.verification_status === 'clinician_verified' || node.verification_status === 'verified')) return false;

      // Date range filter
      if (dateFrom && node.date && node.date < dateFrom) return false;
      if (dateTo && node.date && node.date > dateTo) return false;

      return true;
    });

    // 2. Determine VISIBLE graph nodes based on active view mode and lazy expansion
    let targetVisibleIds = new Set<string>();

    if (viewMode === 'overview') {
      // Clean Clinical Overview: display curated high-priority subset
      const overviewBase = graphData.overview_node_ids && graphData.overview_node_ids.length > 0
        ? graphData.overview_node_ids
        : graphData.nodes.slice(0, 8).map((n) => n.id);
      overviewBase.forEach((id) => targetVisibleIds.add(id));

      // Always include selected node if any
      if (selectedNodeId) targetVisibleIds.add(selectedNodeId);

      // Include user-expanded nodes and their 1-hop connections
      expandedNodeIds.forEach((expId) => {
        targetVisibleIds.add(expId);
        graphData.edges.forEach((e) => {
          if (e.source === expId) targetVisibleIds.add(e.target);
          if (e.target === expId) targetVisibleIds.add(e.source);
        });
      });
    } else if (viewMode === 'condition_centered') {
      // Condition-Centered: focus condition + related meds, monitoring labs, source docs
      if (selectedNodeId) {
        targetVisibleIds.add(selectedNodeId);
        graphData.edges.forEach((e) => {
          if (e.source === selectedNodeId) targetVisibleIds.add(e.target);
          if (e.target === selectedNodeId) targetVisibleIds.add(e.source);
        });
      }
      // Also show other conditions in a compact picker column
      graphData.nodes.filter((n) => n.type === 'condition').forEach((n) => targetVisibleIds.add(n.id));
    } else if (viewMode === 'medication_centered') {
      // Medication-Centered: focus medication + indicated conditions, monitoring labs, source docs
      if (selectedNodeId) {
        targetVisibleIds.add(selectedNodeId);
        graphData.edges.forEach((e) => {
          if (e.source === selectedNodeId) targetVisibleIds.add(e.target);
          if (e.target === selectedNodeId) targetVisibleIds.add(e.source);
        });
      }
      // Also show other medications in a compact picker column
      graphData.nodes.filter((n) => n.type === 'medication').forEach((n) => targetVisibleIds.add(n.id));
    } else if (viewMode === 'lab_centered') {
      // Laboratory-Centered: focus lab + monitored conditions, supporting docs
      if (selectedNodeId) {
        targetVisibleIds.add(selectedNodeId);
        graphData.edges.forEach((e) => {
          if (e.source === selectedNodeId) targetVisibleIds.add(e.target);
          if (e.target === selectedNodeId) targetVisibleIds.add(e.source);
        });
      }
      // Also show other labs in a compact picker column
      graphData.nodes.filter((n) => n.type === 'lab_result' || n.type === 'vital').forEach((n) => targetVisibleIds.add(n.id));
    } else if (viewMode === 'timeline') {
      // Timeline View: sort entities chronologically and show progression
      filteredNodes
        .filter((n) => n.date && n.type !== 'document')
        .slice(0, 16)
        .forEach((n) => targetVisibleIds.add(n.id));
      if (selectedNodeId) targetVisibleIds.add(selectedNodeId);
    }

    // Filter by user search if present
    if (searchQuery) {
      filteredNodes.forEach((n) => targetVisibleIds.add(n.id));
    }

    // Filter visible nodes
    const visNodes = graphData.nodes.filter((n) => targetVisibleIds.has(n.id));
    const visNodeIdSet = new Set(visNodes.map((n) => n.id));

    // Visible edges (only connect visible nodes)
    const visEdges = graphData.edges.filter(
      (e) => visNodeIdSet.has(e.source) && visNodeIdSet.has(e.target)
    );

    // Compute connectivity map for the currently selected node
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

    // 3. Coordinate Layout Calculation (Clean radial & tiered layouts)
    const positions = new Map<string, { x: number; y: number }>();

    if (viewMode === 'timeline') {
      // Horizontal Timeline Layout: chronological from left to right
      const sorted = [...visNodes].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      sorted.forEach((node, idx) => {
        const x = 120 + idx * 240;
        const y = 280 + (idx % 2 === 0 ? -90 : 90);
        positions.set(node.id, { x, y });
      });
    } else if (viewMode === 'condition_centered' || viewMode === 'medication_centered' || viewMode === 'lab_centered') {
      // Focused Radial Layout: Selected entity in center, connected neighbors orbiting neatly
      const centerNode = visNodes.find((n) => n.id === selectedNodeId);
      const centerX = 500;
      const centerY = 340;

      if (centerNode) {
        positions.set(centerNode.id, { x: centerX, y: centerY });
      }

      // Separate connected neighbors from other category nodes
      const neighbors = visNodes.filter((n) => n.id !== selectedNodeId && connNodeIds.has(n.id));
      const others = visNodes.filter((n) => n.id !== selectedNodeId && !connNodeIds.has(n.id));

      // Orbit neighbors
      const radius = 230;
      const angleStep = neighbors.length > 0 ? (2 * Math.PI) / neighbors.length : 0;
      neighbors.forEach((node, idx) => {
        const angle = idx * angleStep - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.set(node.id, { x, y });
      });

      // Place others in a quiet secondary column on the left
      others.forEach((node, idx) => {
        positions.set(node.id, { x: 120, y: 120 + idx * 80 });
      });
    } else {
      // Clinical Overview Layout: 3 Clean Functional Columns
      // Left: Conditions | Center: Medications & Abnormal Labs | Right: Monitoring / Evidence
      const conditions = visNodes.filter((n) => n.type === 'condition');
      const medsAndLabs = visNodes.filter((n) => n.type === 'medication' || n.type === 'lab_result' || n.type === 'vital');
      const docsAndOthers = visNodes.filter((n) => n.type === 'document' || n.type === 'allergy');

      const placeColumn = (items: GraphNode[], xCol: number, yStart = 100, yGap = 130) => {
        items.forEach((item, index) => {
          positions.set(item.id, {
            x: xCol,
            y: yStart + index * yGap,
          });
        });
      };

      placeColumn(conditions, 160, 120, 140);
      placeColumn(medsAndLabs, 500, 100, 130);
      placeColumn(docsAndOthers, 840, 120, 140);
    }

    // 4. Paginate sidebar records
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
    };
  }, [
    graphData,
    viewMode,
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
    return graphData.edges.find((e) => e.id === selectedEdgeId) || null;
  }, [graphData, selectedEdgeId]);

  // Keyboard Navigation: Escape to clear selection, Arrow keys to navigate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
        setSelectedEdgeId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-[820px] bg-neutral-50 dark:bg-neutral-950 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden select-none">
      {/* 1. TOP HEADER & VIEW MODE BAR */}
      <div className="p-3 sm:px-5 sm:py-3.5 bg-white dark:bg-neutral-900 border-b border-neutral-200/80 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        {/* View Modes Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 text-xs">
          <button
            onClick={() => handleViewModeChange('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'overview'
                ? 'bg-white dark:bg-neutral-900 text-primary-700 dark:text-primary-300 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Clinical Overview</span>
          </button>

          <button
            onClick={() => handleViewModeChange('condition_centered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'condition_centered'
                ? 'bg-white dark:bg-neutral-900 text-blue-700 dark:text-blue-300 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Condition-Centered</span>
          </button>

          <button
            onClick={() => handleViewModeChange('medication_centered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'medication_centered'
                ? 'bg-white dark:bg-neutral-900 text-teal-700 dark:text-teal-300 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span>Medication-Centered</span>
          </button>

          <button
            onClick={() => handleViewModeChange('lab_centered')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'lab_centered'
                ? 'bg-white dark:bg-neutral-900 text-emerald-700 dark:text-emerald-300 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Laboratory-Centered</span>
          </button>

          <button
            onClick={() => handleViewModeChange('timeline')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              viewMode === 'timeline'
                ? 'bg-white dark:bg-neutral-900 text-purple-700 dark:text-purple-300 shadow-xs font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </button>
        </div>

        {/* Global Graph Controls (Zoom, Reset, Clear) */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset View</span>
          </button>
          {selectedNodeId && (
            <button
              onClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER & SEARCH STRIP */}
      <div className="px-4 py-2.5 bg-white/60 dark:bg-neutral-900/60 border-b border-neutral-200/70 dark:border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search conditions, medications, labs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Filters bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Entity Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value="all">All Entity Types</option>
            <option value="condition">Conditions</option>
            <option value="medication">Medications</option>
            <option value="lab_result">Laboratory Results</option>
            <option value="vital">Vitals</option>
            <option value="document">Source Documents</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active_only">Active Only</option>
            <option value="inactive_only">Historical / Inactive</option>
          </select>

          {/* Abnormality Filter */}
          <select
            value={abnormalityFilter}
            onChange={(e) => setAbnormalityFilter(e.target.value as any)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value="all">All Observations</option>
            <option value="abnormal_only">Abnormal Labs Only</option>
            <option value="normal_only">Normal Within Range</option>
          </select>

          {/* Verification Filter */}
          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value as any)}
            className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
          >
            <option value="all">All Verifications</option>
            <option value="verified">Clinician Verified</option>
            <option value="unverified">Awaiting Verification</option>
          </select>
        </div>
      </div>

      {/* 3. MAIN THREE-PANE BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR: Paginated Matching Records List */}
        <div className="w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200/80 dark:border-neutral-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            <span>Matching Clinical Records</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
              {totalSidebarRecords}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {paginatedSidebarNodes.map((node) => {
              const isSelected = node.id === selectedNodeId;
              const isConn = connectedNodeIds.has(node.id);
              const colorCfg = getNodeColorConfig(node.type, node.is_abnormal);
              const IconComp = colorCfg.icon;

              return (
                <div
                  key={`sidebar-${node.id}`}
                  onClick={() => {
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-500 bg-primary-50/70 dark:bg-primary-950/40 shadow-xs'
                      : 'border-neutral-200/70 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                      <IconComp className="w-3.5 h-3.5 shrink-0" style={{ color: colorCfg.accent }} />
                      <span className="truncate">{node.label}</span>
                    </span>
                    {node.is_abnormal && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                        {node.abnormality_status?.toUpperCase() || 'ABN'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="capitalize">{node.type.replace('_', ' ')}</span>
                    <span>{node.date || 'No date'}</span>
                  </div>
                </div>
              );
            })}

            {paginatedSidebarNodes.length === 0 && (
              <div className="py-12 text-center text-xs text-neutral-400">
                No clinical records match current filters.
              </div>
            )}
          </div>

          {/* Sidebar Pagination Component */}
          <div className="p-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
            <Pagination
              currentPage={sidebarPage}
              pageSize={sidebarPageSize}
              totalRecords={totalSidebarRecords}
              onPageChange={setSidebarPage}
              className="py-1 px-2 border-none bg-transparent shadow-none"
            />
          </div>
        </div>

        {/* CENTER PANE: Interactive Clinical Canvas */}
        <div
          ref={containerRef}
          onMouseDown={(e) => {
            if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
              setIsDragging(true);
              setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            }
          }}
          onMouseMove={(e) => {
            if (isDragging) {
              setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
            }
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          className="flex-1 relative overflow-hidden bg-dot-pattern cursor-grab active:cursor-grabbing bg-neutral-50/40 dark:bg-neutral-950"
        >
          {/* Canvas SVG for Rendered Nodes and Edges */}
          <svg
            className="w-full h-full pointer-events-auto"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
            }}
          >
            <defs>
              <marker
                id="arrowhead-verified"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#0F766E" />
              </marker>
              <marker
                id="arrowhead-inferred"
                markerWidth="8"
                markerHeight="6"
                refX="7"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
              </marker>
            </defs>

            {/* 1. EDGES */}
            {visibleEdges.map((edge) => {
              const srcPos = nodePositions.get(edge.source);
              const tgtPos = nodePositions.get(edge.target);
              if (!srcPos || !tgtPos) return null;

              const isConnectedToSelected =
                edge.source === selectedNodeId || edge.target === selectedNodeId;
              const isSelectedEdge = edge.id === selectedEdgeId;
              const isInferred = edge.relationship_nature === 'inferred';

              const midX = (srcPos.x + tgtPos.x) / 2;
              const midY = (srcPos.y + tgtPos.y) / 2;

              return (
                <g
                  key={`edge-${edge.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdgeId(edge.id);
                  }}
                  className="cursor-pointer group"
                >
                  <line
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={
                      isSelectedEdge
                        ? '#0F766E'
                        : isConnectedToSelected
                        ? '#2563EB'
                        : isInferred
                        ? '#94A3B8'
                        : '#CBD5E1'
                    }
                    strokeWidth={isSelectedEdge || isConnectedToSelected ? 2.5 : 1.5}
                    strokeDasharray={isInferred ? '5,5' : undefined}
                    opacity={selectedNodeId && !isConnectedToSelected ? 0.25 : 0.85}
                    markerEnd={isInferred ? 'url(#arrowhead-inferred)' : 'url(#arrowhead-verified)'}
                  />

                  {/* Edge Label Badge */}
                  <g transform={`translate(${midX}, ${midY})`}>
                    <rect
                      x="-44"
                      y="-10"
                      width="88"
                      height="20"
                      rx="6"
                      fill={isInferred ? '#F8FAFC' : '#F0FDFA'}
                      stroke={isInferred ? '#CBD5E1' : '#99F6E4'}
                      strokeWidth="1"
                      className="dark:fill-neutral-800 dark:stroke-neutral-700"
                    />
                    <text
                      textAnchor="middle"
                      y="3.5"
                      fontSize="9"
                      fontWeight="600"
                      fill={isInferred ? '#64748B' : '#0F766E'}
                      className="dark:fill-teal-300"
                    >
                      {edge.label}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 2. NODES */}
            {visibleNodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;

              const isSelected = node.id === selectedNodeId;
              const isConnected = connectedNodeIds.has(node.id);
              const isDimmed = selectedNodeId !== null && !isSelected && !isConnected;
              const isExpanded = expandedNodeIds.has(node.id);

              const colorCfg = getNodeColorConfig(node.type, node.is_abnormal);
              const IconComp = colorCfg.icon;

              return (
                <g
                  key={`node-${node.id}`}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNodeId(node.id);
                    setSelectedEdgeId(null);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    toggleExpandNode(node.id);
                  }}
                  className="cursor-pointer transition-transform duration-150 ease-out"
                  opacity={isDimmed ? 0.35 : 1}
                >
                  {/* Selected Focus Halo */}
                  {isSelected && (
                    <circle
                      r="40"
                      fill="none"
                      stroke="#0F766E"
                      strokeWidth="3"
                      strokeDasharray="4,4"
                      className="animate-spin-slow"
                    />
                  )}

                  {/* Main Node Circle */}
                  <circle
                    r="28"
                    fill="#FFFFFF"
                    stroke={isSelected ? '#0F766E' : isConnected ? '#2563EB' : colorCfg.accent}
                    strokeWidth={isSelected ? 3 : 2}
                    className="shadow-md hover:scale-110 transition-transform dark:fill-neutral-900"
                  />

                  {/* Inner Node Icon */}
                  <g transform="translate(-9, -9)">
                    <IconComp className="w-4.5 h-4.5" style={{ color: colorCfg.accent }} />
                  </g>

                  {/* Node Label Text */}
                  <text
                    textAnchor="middle"
                    y="42"
                    fontSize="11"
                    fontWeight="600"
                    fill="#1E293B"
                    className="dark:fill-neutral-200 pointer-events-none select-none"
                  >
                    {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                  </text>

                  {/* Status / Category Subtext */}
                  <text
                    textAnchor="middle"
                    y="55"
                    fontSize="9"
                    fill="#64748B"
                    className="dark:fill-neutral-400 pointer-events-none select-none"
                  >
                    {node.is_abnormal ? `Abnormal (${node.abnormality_status})` : node.category}
                  </text>

                  {/* Expansion indicator badge */}
                  {isSelected && (
                    <g
                      transform="translate(18, -18)"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpandNode(node.id);
                      }}
                    >
                      <title>{isExpanded ? 'Collapse Connections' : 'Expand Immediate Connections'}</title>
                      <circle r="9" fill="#0F766E" />
                      {isExpanded ? (
                        <line x1="-4" y1="0" x2="4" y2="0" stroke="#FFFFFF" strokeWidth="2" />
                      ) : (
                        <>
                          <line x1="-4" y1="0" x2="4" y2="0" stroke="#FFFFFF" strokeWidth="2" />
                          <line x1="0" y1="-4" x2="0" y2="4" stroke="#FFFFFF" strokeWidth="2" />
                        </>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Quick Help Overlay */}
          <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xs border border-neutral-200/60 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-2 pointer-events-none shadow-xs">
            <Info className="w-3.5 h-3.5 text-primary-600" />
            <span>Click to inspect details. Double-click to expand/collapse relationships.</span>
          </div>
        </div>

        {/* RIGHT DRAWER: Redesigned Relationship Details Panel */}
        <div className="w-96 bg-white dark:bg-neutral-900 border-l border-neutral-200/80 dark:border-neutral-800 flex flex-col shrink-0 overflow-y-auto">
          {selectedEdge ? (
            /* Edge Details View */
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                    Clinical Relationship
                  </span>
                  <h4 className="text-base font-bold text-neutral-900 dark:text-white">
                    {selectedEdge.label}
                  </h4>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                  selectedEdge.relationship_nature === 'inferred'
                    ? 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                    : 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                }`}>
                  {selectedEdge.relationship_nature === 'inferred' ? 'Inferred' : 'Documented'}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <span className="font-semibold text-neutral-700 dark:text-neutral-300">Rationale</span>
                <p className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {selectedEdge.explanation || 'Explicit link verified from clinical report.'}
                </p>
              </div>

              {selectedEdge.source_document_name && (
                <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400">
                    <span>Source Report</span>
                    <span>Page {selectedEdge.source_page || 1}</span>
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white truncate">
                    {selectedEdge.source_document_name}
                  </p>
                  {selectedEdge.source_excerpt && (
                    <blockquote className="mt-2 pl-2 border-l-2 border-teal-500 text-[11px] text-neutral-600 dark:text-neutral-400 italic">
                      "{selectedEdge.source_excerpt}"
                    </blockquote>
                  )}
                </div>
              )}
            </div>
          ) : selectedNode ? (
            /* Node Details View */
            <div className="p-5 space-y-5 text-xs">
              {/* Header */}
              <div className="space-y-1.5 border-b border-neutral-100 dark:border-neutral-800 pb-3">
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {selectedNode.type.replace('_', ' ')}
                  </span>
                  {selectedNode.is_abnormal && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
                      {selectedNode.abnormality_status?.toUpperCase() || 'ABNORMAL'}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                  {selectedNode.label}
                </h3>
                {selectedNode.date && (
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Documented: {selectedNode.date}</span>
                  </p>
                )}
              </div>

              {/* Clinical Attributes Section (No empty placeholders) */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-900 dark:text-white">Clinical Attributes</span>
                <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-800 space-y-1.5">
                  {selectedNode.details?.value && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Observed Result:</span>
                      <strong className="text-neutral-900 dark:text-white">
                        {selectedNode.details.value} {selectedNode.details.unit || selectedNode.details.standard_unit || ''}
                      </strong>
                    </div>
                  )}
                  {selectedNode.details?.reference_range && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Reference Range:</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{selectedNode.details.reference_range}</span>
                    </div>
                  )}
                  {selectedNode.details?.dosage && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Dosage:</span>
                      <strong className="text-neutral-900 dark:text-white">{selectedNode.details.dosage}</strong>
                    </div>
                  )}
                  {selectedNode.details?.frequency && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Frequency:</span>
                      <span className="text-neutral-800 dark:text-neutral-200">{selectedNode.details.frequency}</span>
                    </div>
                  )}
                  {selectedNode.details?.status && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500 dark:text-neutral-400">Status:</span>
                      <span className="capitalize text-neutral-800 dark:text-neutral-200">{selectedNode.details.status}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-neutral-500 dark:text-neutral-400">Verification:</span>
                    <span className="font-medium text-teal-700 dark:text-teal-400 capitalize">
                      {selectedNode.verification_status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Source Provenance Section */}
              <div className="space-y-2">
                <span className="font-semibold text-neutral-900 dark:text-white">Source Provenance</span>
                <div className="p-3 rounded-lg border border-neutral-200/80 dark:border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="truncate">{selectedNode.document_name || 'Medical Document'}</span>
                    <span>Page {selectedNode.source_page || 1}</span>
                  </div>
                  {selectedNode.source_excerpt ? (
                    <blockquote className="pl-2 border-l-2 border-teal-500 text-[11px] text-neutral-600 dark:text-neutral-400 italic leading-relaxed">
                      "{selectedNode.source_excerpt}"
                    </blockquote>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic">Direct OCR extraction from primary record.</p>
                  )}
                </div>
              </div>

              {/* Extraction Confidence Section */}
              {selectedNode.confidence_score !== undefined && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900 dark:text-white">Extraction Confidence</span>
                    <span className="font-bold text-teal-700 dark:text-teal-400">{selectedNode.confidence_score}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        selectedNode.confidence_score >= 80
                          ? 'bg-teal-500'
                          : selectedNode.confidence_score >= 60
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${selectedNode.confidence_score}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Direct Actions Strip */}
              <div className="pt-2 space-y-2">
                {/* Lab Trend Action */}
                {(selectedNode.type === 'lab_result' || selectedNode.type === 'vital') && (
                  <button
                    onClick={() => handleOpenLabTrend(selectedNode)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors shadow-xs"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>View Laboratory Trend Chart</span>
                  </button>
                )}

                {/* Inspect Source Evidence */}
                {selectedNode.id.startsWith('fact-') && (
                  <button
                    onClick={() => handleInspectEvidence(selectedNode)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5 text-primary-600" />
                    <span>Inspect Ground-Truth Excerpt</span>
                  </button>
                )}

                {/* View Document directly if document_id present */}
                {selectedNode.document_id && onInspectDocument && (
                  <button
                    onClick={() => onInspectDocument(selectedNode.document_id!)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-purple-600" />
                    <span>Open Medical Record File</span>
                  </button>
                )}

                {/* Jump to timeline */}
                {selectedNode.id.startsWith('fact-') && onJumpToTimeline && (
                  <button
                    onClick={() => {
                      const factId = parseInt(selectedNode.id.replace('fact-', ''), 10);
                      onJumpToTimeline(factId);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Locate in Timeline History</span>
                  </button>
                )}

                {/* Toggle Immediate Expansion */}
                <button
                  onClick={() => toggleExpandNode(selectedNode.id)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
                >
                  {expandedNodeIds.has(selectedNode.id) ? (
                    <>
                      <MinusCircle className="w-3.5 h-3.5" />
                      <span>Collapse Relationships</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Expand Immediate Relationships</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 p-6 text-center text-xs text-neutral-400 space-y-3">
              <Compass className="w-10 h-10 text-neutral-400 mx-auto opacity-40" />
              <p>Select any clinical entity or connecting line to inspect verified provenance and attributes.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />

      {/* Confidence Breakdown Modal */}
      <ConfidenceInspectorModal
        confidenceDetail={confidenceDetail}
        isOpen={!!confidenceDetail}
        onClose={() => setConfidenceDetail(null)}
      />

      {/* Laboratory Trend Chart Modal */}
      <LabTrendModal
        isOpen={labTrendModalOpen}
        onClose={() => setLabTrendModalOpen(false)}
        canonicalId={trendModalTarget.canonicalId}
        testName={trendModalTarget.testName}
        patientId={patientId}
      />
    </div>
  );
};
