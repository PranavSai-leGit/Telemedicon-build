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
  FileCheck,
  ChevronRight,
  Maximize2,
  Check
} from 'lucide-react';
import { GraphNode, GraphEdge, RelationshipGraphResponse, FactConfidenceDetail } from '../types';
import { EvidenceModal } from './EvidenceModal';
import { ConfidenceBadge } from './ConfidenceBadge';
import { ConfidenceInspectorModal } from './ConfidenceInspectorModal';
import { api } from '../services/api';

interface MedicalRelationshipMapProps {
  graphData: RelationshipGraphResponse | null;
  loading?: boolean;
  onJumpToTimeline?: (factId: number) => void;
}

export type ExplorerViewMode = 'overview' | 'journey' | 'review' | 'evidence';

export const MedicalRelationshipMap: React.FC<MedicalRelationshipMapProps> = ({
  graphData,
  loading = false,
  onJumpToTimeline,
}) => {
  // Navigation & View state
  const [viewMode, setViewMode] = useState<ExplorerViewMode>('overview');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Selection & Query state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modals state
  const [evidenceData, setEvidenceData] = useState<any | null>(null);
  const [confidenceDetail, setConfidenceDetail] = useState<FactConfidenceDetail | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Set default selection when graphData loads
  useEffect(() => {
    if (graphData && graphData.nodes.length > 0 && !selectedNodeId) {
      // Pick the first condition or first node
      const firstCondition = graphData.nodes.find((n) => n.type === 'condition') || graphData.nodes[0];
      setSelectedNodeId(firstCondition.id);
    }
  }, [graphData]);

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

  // Node Category Configuration with Official Color Tokens
  const getNodeColorConfig = (type: string, isConflict = false) => {
    if (isConflict) {
      return {
        bg: 'bg-[#FFFBEB] dark:bg-[#451A03]/30',
        border: 'border-[#FDE68A] dark:border-[#FCD34D]/40',
        accent: '#D97706',
        text: 'text-[#92400E] dark:text-[#FCD34D]',
        badge: 'med-badge-warning',
        icon: AlertTriangle,
      };
    }

    switch (type) {
      case 'condition':
        return {
          bg: 'bg-[#EFF6FF] dark:bg-[#1E293B]',
          border: 'border-[#BFDBFE] dark:border-[#3B82F6]/30',
          accent: '#2563EB',
          text: 'text-[#1E40AF] dark:text-[#93C5FD]',
          badge: 'med-badge-blue',
          icon: Activity,
        };
      case 'medication':
        return {
          bg: 'bg-[#E4F3F0] dark:bg-[#123831]',
          border: 'border-[#0F766E]/20 dark:border-[#5EEAD4]/30',
          accent: '#0F766E',
          text: 'text-[#0F766E] dark:text-[#5EEAD4]',
          badge: 'med-badge-teal',
          icon: Pill,
        };
      case 'lab_result':
        return {
          bg: 'bg-[#FFFBEB] dark:bg-[#451A03]/30',
          border: 'border-[#FDE68A] dark:border-[#FCD34D]/40',
          accent: '#D97706',
          text: 'text-[#92400E] dark:text-[#FCD34D]',
          badge: 'med-badge-warning',
          icon: FlaskConical,
        };
      case 'document':
        return {
          bg: 'bg-[#F5F3FF] dark:bg-[#2E1065]/30',
          border: 'border-[#DDD6FE] dark:border-[#7C3AED]/30',
          accent: '#7C3AED',
          text: 'text-[#6D28D9] dark:text-[#C4B5FD]',
          badge: 'med-badge-neutral',
          icon: FileText,
        };
      default:
        return {
          bg: 'bg-[#F1F5F9] dark:bg-[#1E293B]',
          border: 'border-[#CBD5E1] dark:border-[#475569]',
          accent: '#475569',
          text: 'text-[#334155] dark:text-[#CBD5E1]',
          badge: 'med-badge-neutral',
          icon: Layers,
        };
    }
  };

  // Filtered dataset based on viewMode & user selections
  const {
    filteredNodes,
    filteredEdges,
    nodePositions,
    connectedNodeIds,
    connectedEdgeIds,
    conflictNodes,
    medicationJourneyList
  } = useMemo(() => {
    if (!graphData || !graphData.nodes.length) {
      return {
        filteredNodes: [],
        filteredEdges: [],
        nodePositions: new Map<string, { x: number; y: number }>(),
        connectedNodeIds: new Set<string>(),
        connectedEdgeIds: new Set<string>(),
        conflictNodes: [],
        medicationJourneyList: []
      };
    }

    // 1. Identify conflicts (discrepancy edges or low confidence)
    const conflictEdges = graphData.edges.filter(
      (e) => e.relationship_type === 'discrepancy' || e.label.toLowerCase().includes('mismatch') || e.label.toLowerCase().includes('conflict')
    );
    const conflictIdSet = new Set<string>();
    conflictEdges.forEach((e) => {
      conflictIdSet.add(e.source);
      conflictIdSet.add(e.target);
    });

    const cNodes = graphData.nodes.filter(
      (n) => conflictIdSet.has(n.id) || (n.confidence_score !== undefined && n.confidence_score < 60)
    );

    // 2. Filter nodes based on viewMode and search
    let activeNodes = graphData.nodes.filter((node) => {
      // Search matching
      const matchesSearch =
        !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.document_name && node.document_name.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category filter
      const matchesType = filterType === 'all' || node.type === filterType;

      // Status filter
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'conflict' && (conflictIdSet.has(node.id) || (node.confidence_score !== undefined && node.confidence_score < 60))) ||
        (filterStatus === 'verified' && node.verification_status === 'verified') ||
        (filterStatus === 'unverified' && node.verification_status !== 'verified');

      return matchesSearch && matchesType && matchesStatus;
    });

    // In Mode D (Evidence Connections), only include facts and documents
    if (viewMode === 'evidence') {
      activeNodes = activeNodes.filter((n) => n.type === 'document' || n.type === 'condition' || n.type === 'medication');
    }

    const activeNodeIdSet = new Set(activeNodes.map((n) => n.id));

    // Filter edges between active nodes
    const activeEdges = graphData.edges.filter(
      (edge) => activeNodeIdSet.has(edge.source) && activeNodeIdSet.has(edge.target)
    );

    // Compute connectivity map for the active selection
    const connNodeIds = new Set<string>();
    const connEdgeIds = new Set<string>();

    if (selectedNodeId) {
      connNodeIds.add(selectedNodeId);
      activeEdges.forEach((edge) => {
        if (edge.source === selectedNodeId) {
          connNodeIds.add(edge.target);
          connEdgeIds.add(edge.id);
        } else if (edge.target === selectedNodeId) {
          connNodeIds.add(edge.source);
          connEdgeIds.add(edge.id);
        }
      });
    }

    // Positions: Layout into functional tiers (Conditions on Left, Medications/Labs in Center, Documents on Right)
    const positions = new Map<string, { x: number; y: number }>();
    const conditions = activeNodes.filter((n) => n.type === 'condition');
    const medications = activeNodes.filter((n) => n.type === 'medication' || n.type === 'allergy');
    const labs = activeNodes.filter((n) => n.type === 'lab_result');
    const docs = activeNodes.filter((n) => n.type === 'document');
    const others = activeNodes.filter((n) => !['condition', 'medication', 'allergy', 'lab_result', 'document'].includes(n.type));

    const assignColumn = (items: GraphNode[], xCol: number, yStart = 60, yGap = 110) => {
      items.forEach((item, index) => {
        positions.set(item.id, {
          x: xCol,
          y: yStart + index * yGap,
        });
      });
    };

    assignColumn(conditions, 60, 60, 110);
    assignColumn(medications, 340, 60, 110);
    assignColumn(labs, 620, 60, 110);
    assignColumn(docs, 900, 60, 110);
    assignColumn(others, 1160, 60, 110);

    // 3. Medication Journey list (chronologically sorted medications with dosage changes)
    const medList = graphData.nodes
      .filter((n) => n.type === 'medication')
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    return {
      filteredNodes: activeNodes,
      filteredEdges: activeEdges,
      nodePositions: positions,
      connectedNodeIds: connNodeIds,
      connectedEdgeIds: connEdgeIds,
      conflictNodes: cNodes,
      medicationJourneyList: medList
    };
  }, [graphData, searchQuery, filterType, filterStatus, selectedNodeId, viewMode]);

  // Selected entities
  const selectedNode = useMemo(
    () => graphData?.nodes.find((n) => n.id === selectedNodeId) || null,
    [graphData, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => graphData?.edges.find((e) => e.id === selectedEdgeId) || null,
    [graphData, selectedEdgeId]
  );

  // Zoom / Pan Handlers
  const handleZoom = (factor: number) => {
    setZoom((prev) => Math.min(Math.max(0.4, prev * factor), 2.0));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    if (filteredNodes.length > 0) {
      setSelectedNodeId(filteredNodes[0].id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.interactive-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Quick Clinical Shortcuts
  const handleShortcut = (shortcutType: string) => {
    switch (shortcutType) {
      case 'why_medication':
        setViewMode('overview');
        setFilterType('medication');
        const firstMed = graphData?.nodes.find((n) => n.type === 'medication');
        if (firstMed) setSelectedNodeId(firstMed.id);
        break;
      case 'what_changed':
        setViewMode('journey');
        break;
      case 'which_conflicts':
        setViewMode('review');
        setFilterStatus('conflict');
        if (conflictNodes.length > 0) setSelectedNodeId(conflictNodes[0].id);
        break;
      case 'evidence_sources':
        setViewMode('evidence');
        break;
      case 'conditions_overview':
        setViewMode('overview');
        setFilterType('condition');
        const firstCond = graphData?.nodes.find((n) => n.type === 'condition');
        if (firstCond) setSelectedNodeId(firstCond.id);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-4">
      {/* 
        Top Explorer Control Header
        Includes page title, explanatory subtitle, view mode selector, and quick clinical shortcuts
      */}
      <div className="med-card p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#D9E3EB] dark:border-[#2A3A4D] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="med-badge med-badge-teal">Information Navigation</span>
              <span className="text-[11px] text-[#536777] dark:text-[#91A3B5] font-mono">
                {graphData?.nodes.length || 0} Entities • {graphData?.edges.length || 0} Verified Links
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-[#172B3A] dark:text-[#E7EEF5] mt-1">
              Medical Relationship Explorer
            </h2>
            <p className="text-xs text-[#536777] dark:text-[#91A3B5]">
              Explore documented clinical connections, medication changes over time, and source document evidence.
            </p>
          </div>

          {/* View Mode Selector Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-[#EDF3F7] dark:bg-[#162437] border border-[#D9E3EB] dark:border-[#2A3A4D] self-start md:self-auto shrink-0">
            {[
              { id: 'overview', label: 'Relationship Overview', icon: Compass },
              { id: 'journey', label: 'Medication Journey', icon: Clock },
              { id: 'review', label: 'Needs Review', icon: AlertTriangle, count: conflictNodes.length },
              { id: 'evidence', label: 'Evidence Connections', icon: FileCheck },
            ].map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setViewMode(tab.id as ExplorerViewMode);
                    if (tab.id === 'review') setFilterStatus('conflict');
                    else setFilterStatus('all');
                  }}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    viewMode === tab.id
                      ? 'bg-white dark:bg-[#111C2C] text-[#0F766E] dark:text-[#5EEAD4] shadow-xs'
                      : 'text-[#536777] dark:text-[#B2C0CE] hover:text-[#172B3A] dark:hover:text-[#E7EEF5]'
                  }`}
                >
                  <TabIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#B42318] text-white">
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Clinical Shortcuts Row */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-[11px] font-semibold text-[#536777] dark:text-[#91A3B5] mr-1">
            Clinical Queries:
          </span>
          <button
            onClick={() => handleShortcut('why_medication')}
            className="px-2.5 py-1 rounded-md bg-[#EDF3F7] dark:bg-[#162437] hover:bg-[#E4F3F0] dark:hover:bg-[#123831] text-[#172B3A] dark:text-[#E7EEF5] border border-[#D9E3EB] dark:border-[#2A3A4D] transition-colors"
          >
            Why is this medication recorded?
          </button>
          <button
            onClick={() => handleShortcut('what_changed')}
            className="px-2.5 py-1 rounded-md bg-[#EDF3F7] dark:bg-[#162437] hover:bg-[#E4F3F0] dark:hover:bg-[#123831] text-[#172B3A] dark:text-[#E7EEF5] border border-[#D9E3EB] dark:border-[#2A3A4D] transition-colors"
          >
            What changed over time?
          </button>
          <button
            onClick={() => handleShortcut('which_conflicts')}
            className="px-2.5 py-1 rounded-md bg-[#FFFBEB] dark:bg-[#451A03]/30 hover:bg-[#FDE68A]/40 text-[#92400E] dark:text-[#FCD34D] border border-[#FDE68A] dark:border-[#FCD34D]/40 transition-colors"
          >
            Which records conflict?
          </button>
          <button
            onClick={() => handleShortcut('evidence_sources')}
            className="px-2.5 py-1 rounded-md bg-[#EDF3F7] dark:bg-[#162437] hover:bg-[#E4F3F0] dark:hover:bg-[#123831] text-[#172B3A] dark:text-[#E7EEF5] border border-[#D9E3EB] dark:border-[#2A3A4D] transition-colors"
          >
            Where did this information come from?
          </button>
          <button
            onClick={() => handleShortcut('conditions_overview')}
            className="px-2.5 py-1 rounded-md bg-[#EDF3F7] dark:bg-[#162437] hover:bg-[#E4F3F0] dark:hover:bg-[#123831] text-[#172B3A] dark:text-[#E7EEF5] border border-[#D9E3EB] dark:border-[#2A3A4D] transition-colors"
          >
            Diagnoses & Conditions
          </button>
        </div>
      </div>

      {/* Main Three-Region Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* ================================================================ */}
        {/* LEFT REGION: Explore & Search Panel (lg:col-span-3)              */}
        {/* ================================================================ */}
        <div className="lg:col-span-3 med-card p-4 space-y-4">
          <div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#536777]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search condition, drug, test..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#D9E3EB] dark:border-[#2A3A4D] bg-[#FFFFFF] dark:bg-[#111C2C] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5]">
              Clinical Domains
            </span>
            <div className="flex flex-col gap-1 text-xs">
              {[
                { id: 'all', label: 'All Entities', count: graphData?.nodes.length || 0 },
                { id: 'condition', label: 'Conditions', count: graphData?.nodes.filter((n) => n.type === 'condition').length || 0 },
                { id: 'medication', label: 'Medications', count: graphData?.nodes.filter((n) => n.type === 'medication').length || 0 },
                { id: 'lab_result', label: 'Laboratory Measurements', count: graphData?.nodes.filter((n) => n.type === 'lab_result').length || 0 },
                { id: 'document', label: 'Source Documents', count: graphData?.nodes.filter((n) => n.type === 'document').length || 0 },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setFilterType(c.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md flex items-center justify-between text-xs transition-colors ${
                    filterType === c.id
                      ? 'bg-[#E4F3F0] dark:bg-[#123831] text-[#0F766E] dark:text-[#5EEAD4] font-semibold border border-[#0F766E]/20'
                      : 'text-[#536777] dark:text-[#B2C0CE] hover:bg-[#EDF3F7] dark:hover:bg-[#162437]'
                  }`}
                >
                  <span>{c.label}</span>
                  <span className="font-mono text-[10px] text-[#536777] dark:text-[#91A3B5]">{c.count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Status Filter */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5]">
              Verification Status
            </span>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              {[
                { id: 'all', label: 'All Records' },
                { id: 'verified', label: 'Verified Only' },
                { id: 'unverified', label: 'Needs Review' },
                { id: 'conflict', label: 'Conflicts' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setFilterStatus(s.id)}
                  className={`px-2 py-1 rounded text-center border transition-colors ${
                    filterStatus === s.id
                      ? 'bg-[#173B57] text-white border-transparent'
                      : 'border-[#D9E3EB] dark:border-[#2A3A4D] text-[#536777] dark:text-[#B2C0CE] hover:bg-[#EDF3F7] dark:hover:bg-[#162437]'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Entities List in current filter */}
          <div className="space-y-1.5 pt-2 border-t border-[#D9E3EB] dark:border-[#2A3A4D]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5]">
              Matching Records ({filteredNodes.length})
            </span>
            <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs">
              {filteredNodes.length === 0 ? (
                <p className="text-[#536777] dark:text-[#91A3B5] text-[11px] italic py-2">
                  No records match the current filters.
                </p>
              ) : (
                filteredNodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const config = getNodeColorConfig(node.type);
                  return (
                    <button
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                      }}
                      className={`w-full text-left p-1.5 rounded-md flex items-center justify-between text-xs transition-colors ${
                        isSelected
                          ? 'bg-[#173B57] text-white font-semibold'
                          : 'hover:bg-[#EDF3F7] dark:hover:bg-[#162437] text-[#172B3A] dark:text-[#E7EEF5]'
                      }`}
                    >
                      <span className="truncate pr-1">{node.label}</span>
                      <span
                        className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold shrink-0 ${
                          isSelected ? 'bg-white/20 text-white' : `${config.bg} ${config.text}`
                        }`}
                      >
                        {node.type}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ================================================================ */}
        {/* CENTER REGION: Interactive Relationship Canvas (lg:col-span-6)  */}
        {/* ================================================================ */}
        <div className="lg:col-span-6 med-card overflow-hidden flex flex-col relative min-h-[580px]">
          {/* Canvas Controls Toolbar */}
          <div className="p-3 border-b border-[#D9E3EB] dark:border-[#2A3A4D] bg-[#EDF3F7]/60 dark:bg-[#162437]/60 flex items-center justify-between z-10">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-[#172B3A] dark:text-[#E7EEF5]">
                {viewMode === 'journey'
                  ? 'Medication Timeline & Dosage Sequence'
                  : viewMode === 'review'
                  ? 'Conflict & Discrepancy Inspection View'
                  : viewMode === 'evidence'
                  ? 'Source Provenance & Document Network'
                  : 'Clinical Relationship Graph'}
              </span>
            </div>

            {viewMode !== 'journey' && (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleZoom(1.2)}
                  className="p-1 rounded bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] text-[#536777] hover:text-[#172B3A] dark:hover:text-[#E7EEF5]"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleZoom(0.8)}
                  className="p-1 rounded bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] text-[#536777] hover:text-[#172B3A] dark:hover:text-[#E7EEF5]"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-1 rounded bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] text-[#536777] hover:text-[#172B3A] dark:hover:text-[#E7EEF5]"
                  title="Reset View"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mode B: Medication Journey Lane View */}
          {viewMode === 'journey' ? (
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div className="p-3 rounded-lg bg-[#E4F3F0] dark:bg-[#123831] border border-[#0F766E]/20 text-xs text-[#0F766E] dark:text-[#5EEAD4] flex items-center space-x-2">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Chronological progression of prescribed medications, dosage updates, and status history.
                </span>
              </div>

              {medicationJourneyList.length === 0 ? (
                <div className="py-16 text-center text-xs text-[#536777] dark:text-[#91A3B5] italic">
                  No medication records documented in patient history.
                </div>
              ) : (
                <div className="relative border-l-2 border-[#0F766E]/30 dark:border-[#5EEAD4]/30 ml-4 space-y-6 py-2">
                  {medicationJourneyList.map((med, index) => {
                    const isSelected = selectedNodeId === med.id;
                    return (
                      <div key={med.id} className="relative pl-6">
                        {/* Timeline Marker Node */}
                        <div
                          className={`absolute -left-2 top-1.5 w-4 h-4 rounded-full border-2 bg-white dark:bg-[#111C2C] transition-all ${
                            isSelected
                              ? 'border-[#0F766E] ring-4 ring-[#0F766E]/20'
                              : 'border-[#536777]'
                          }`}
                        />

                        {/* Card */}
                        <div
                          onClick={() => {
                            setSelectedNodeId(med.id);
                            setSelectedEdgeId(null);
                          }}
                          className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-[#0F766E] bg-[#E4F3F0]/40 dark:bg-[#123831]/40 shadow-xs'
                              : 'border-[#D9E3EB] dark:border-[#2A3A4D] bg-white dark:bg-[#111C2C] hover:border-[#0F766E]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-[#172B3A] dark:text-[#E7EEF5]">
                              {med.label}
                            </span>
                            <span className="text-[11px] font-mono text-[#536777] dark:text-[#91A3B5] flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> {med.date || 'Date Unspecified'}
                            </span>
                          </div>

                          <div className="mt-1 text-xs text-[#536777] dark:text-[#B2C0CE] flex items-center gap-2">
                            <span>Status: <strong className="capitalize">{med.verification_status}</strong></span>
                            {med.document_name && <span>• Source: {med.document_name}</span>}
                          </div>

                          {med.source_excerpt && (
                            <blockquote className="mt-2 p-2 rounded bg-[#F5F8FB] dark:bg-[#0B1220] border border-[#D9E3EB] dark:border-[#2A3A4D] text-[11px] text-[#536777] dark:text-[#91A3B5] italic">
                              "{med.source_excerpt}"
                            </blockquote>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Mode A, C, D: Interactive SVG Canvas */
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="flex-1 w-full h-[520px] overflow-hidden cursor-grab active:cursor-grabbing bg-[#F5F8FB] dark:bg-[#0B1220] relative select-none"
            >
              <div
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  position: 'absolute',
                  width: '1800px',
                  height: '1200px',
                }}
              >
                {/* SVG Connecting Edges */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                  <defs>
                    <marker
                      id="arrow-verified"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0F766E" />
                    </marker>
                    <marker
                      id="arrow-conflict"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#B42318" />
                    </marker>
                    <marker
                      id="arrow-neutral"
                      viewBox="0 0 10 10"
                      refX="18"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 0 L 10 5 L 0 10 z" fill="#65798A" />
                    </marker>
                  </defs>

                  {filteredEdges.map((edge) => {
                    const sourcePos = nodePositions.get(edge.source);
                    const targetPos = nodePositions.get(edge.target);
                    if (!sourcePos || !targetPos) return null;

                    const isSelected = selectedEdgeId === edge.id;
                    const isConnected = connectedEdgeIds.has(edge.id);
                    const isConflict = edge.relationship_type === 'discrepancy' || edge.label.toLowerCase().includes('mismatch');

                    // Node card width ~240, height ~80
                    const sx = sourcePos.x + 220;
                    const sy = sourcePos.y + 40;
                    const tx = targetPos.x;
                    const ty = targetPos.y + 40;
                    const mx = (sx + tx) / 2;
                    const my = (sy + ty) / 2;

                    const strokeColor = isConflict
                      ? '#B42318'
                      : isSelected || isConnected
                      ? '#0F766E'
                      : '#CBD5E1';

                    const strokeWidth = isSelected ? 3 : isConnected ? 2 : 1.5;
                    const isDashed = isConflict || edge.status === 'unverified';

                    return (
                      <g key={edge.id} className="cursor-pointer pointer-events-auto" onClick={() => setSelectedEdgeId(edge.id)}>
                        <path
                          d={`M ${sx} ${sy} C ${sx + 60} ${sy}, ${tx - 60} ${ty}, ${tx} ${ty}`}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                          strokeDasharray={isDashed ? '4,4' : undefined}
                          markerEnd={isConflict ? 'url(#arrow-conflict)' : 'url(#arrow-verified)'}
                        />

                        {/* Edge Label Pill */}
                        <g transform={`translate(${mx}, ${my})`}>
                          <rect
                            x="-50"
                            y="-10"
                            width="100"
                            height="20"
                            rx="4"
                            className="fill-white dark:fill-[#111C2C] stroke-[#D9E3EB] dark:stroke-[#2A3A4D]"
                            strokeWidth="1"
                          />
                          <text
                            textAnchor="middle"
                            y="4"
                            className={`text-[9px] font-semibold select-none ${
                              isConflict ? 'fill-[#B42318]' : 'fill-[#536777] dark:fill-[#91A3B5]'
                            }`}
                          >
                            {edge.label}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </svg>

                {/* Render Nodes as Structured Clinical Cards */}
                {filteredNodes.map((node) => {
                  const pos = nodePositions.get(node.id);
                  if (!pos) return null;

                  const isSelected = selectedNodeId === node.id;
                  const isConnected = connectedNodeIds.has(node.id);
                  const isDimmed = selectedNodeId && !isConnected && !isSelected;
                  const isConflict = conflictNodes.some((c) => c.id === node.id);
                  const config = getNodeColorConfig(node.type, isConflict);
                  const Icon = config.icon;

                  return (
                    <div
                      key={node.id}
                      style={{
                        left: `${pos.x}px`,
                        top: `${pos.y}px`,
                        opacity: isDimmed ? 0.35 : 1,
                        zIndex: isSelected ? 10 : 2,
                      }}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        setSelectedEdgeId(null);
                      }}
                      className={`interactive-node absolute w-60 p-3 rounded-lg border transition-all duration-150 cursor-pointer shadow-xs ${
                        config.bg
                      } ${
                        isSelected
                          ? 'ring-2 ring-[#0F766E] border-[#0F766E] shadow-md scale-102'
                          : isConnected
                          ? 'border-[#0F766E]/60 shadow-xs'
                          : config.border
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center space-x-1.5 truncate">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                            style={{ backgroundColor: config.accent, color: '#FFFFFF' }}
                          >
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5] truncate">
                            {node.category}
                          </span>
                        </div>

                        {node.date && (
                          <span className="text-[9px] font-medium text-[#536777] dark:text-[#91A3B5] shrink-0 flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" /> {node.date}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-[#172B3A] dark:text-[#E7EEF5] mt-1.5 line-clamp-2 leading-snug">
                        {node.label}
                      </h4>

                      <div className="mt-2 pt-1.5 border-t border-[#D9E3EB] dark:border-[#2A3A4D] flex items-center justify-between text-[10px]">
                        <span className="truncate max-w-[100px] text-[#536777] dark:text-[#91A3B5]">
                          {node.document_name ? `Doc: ${node.document_name}` : 'Record'}
                        </span>
                        <div className="flex items-center gap-1">
                          {node.id.startsWith('fact-') && (
                            <ConfidenceBadge
                              score={node.confidence_score}
                              label={node.confidence_label}
                              compact
                              onClick={() => handleInspectConfidence(node)}
                            />
                          )}
                          <span className="capitalize font-semibold text-[#0F766E] dark:text-[#5EEAD4]">
                            {node.verification_status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* RIGHT REGION: Clinical Evidence & Entity Details (lg:col-span-3) */}
        {/* ================================================================ */}
        <div className="lg:col-span-3 med-card p-4 space-y-4">
          {selectedEdge ? (
            /* Selected Edge Explanation */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#D9E3EB] dark:border-[#2A3A4D] pb-2">
                <span className="med-badge med-badge-teal">Relationship Link</span>
                <button
                  onClick={() => setSelectedEdgeId(null)}
                  className="text-xs text-[#536777] hover:text-[#172B3A]"
                >
                  ✕
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-[#172B3A] dark:text-[#E7EEF5]">
                  {selectedEdge.label}
                </h3>
                <span className="text-[10px] font-mono text-[#536777] dark:text-[#91A3B5]">
                  Type: {selectedEdge.relationship_type}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[#EDF3F7] dark:bg-[#162437] border border-[#D9E3EB] dark:border-[#2A3A4D] space-y-1.5">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#173B57] dark:text-[#8FB8D8]">
                  Why are these items connected?
                </h4>
                <p className="text-xs text-[#172B3A] dark:text-[#E7EEF5] leading-relaxed">
                  {selectedEdge.explanation ||
                    'Clinical association grounded in shared prescription and document provenance records.'}
                </p>
              </div>
            </div>
          ) : selectedNode ? (
            /* Selected Node Details */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b border-[#D9E3EB] dark:border-[#2A3A4D] pb-2">
                <span className="med-badge med-badge-teal">{selectedNode.category}</span>
                {selectedNode.id.startsWith('fact-') && (
                  <ConfidenceBadge
                    score={selectedNode.confidence_score}
                    label={selectedNode.confidence_label}
                    onClick={() => handleInspectConfidence(selectedNode)}
                  />
                )}
              </div>

              <div>
                <h3 className="text-base font-bold text-[#172B3A] dark:text-[#E7EEF5]">
                  {selectedNode.label}
                </h3>
                {selectedNode.date && (
                  <span className="text-xs text-[#536777] dark:text-[#91A3B5] flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> Recorded: {selectedNode.date}
                  </span>
                )}
              </div>

              {/* Clinical Attributes */}
              <div className="p-3 rounded-lg bg-[#EDF3F7] dark:bg-[#162437] border border-[#D9E3EB] dark:border-[#2A3A4D] space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5] block">
                  Documented Attributes
                </span>
                {Object.entries(selectedNode.details).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-[#D9E3EB]/50 dark:border-[#2A3A4D]/50 pb-1">
                    <span className="text-[#536777] dark:text-[#91A3B5] capitalize">{k.replace('_', ' ')}:</span>
                    <span className="font-semibold text-[#172B3A] dark:text-[#E7EEF5] text-right truncate max-w-[150px]">
                      {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Source Evidence Provenance */}
              <div className="p-3 rounded-lg bg-[#EDF3F7] dark:bg-[#162437] border border-[#D9E3EB] dark:border-[#2A3A4D] space-y-1.5 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#536777] dark:text-[#91A3B5] block">
                  Source Provenance
                </span>
                <div className="flex items-center space-x-1.5 text-[#172B3A] dark:text-[#E7EEF5] font-semibold">
                  <FileText className="w-3.5 h-3.5 text-[#0F766E]" />
                  <span className="truncate">{selectedNode.document_name || 'Clinical Document'}</span>
                  {selectedNode.source_page && <span>(Pg {selectedNode.source_page})</span>}
                </div>
                {selectedNode.source_excerpt ? (
                  <blockquote className="p-2 rounded bg-white dark:bg-[#111C2C] border border-[#D9E3EB] dark:border-[#2A3A4D] text-[11px] text-[#536777] dark:text-[#B2C0CE] italic leading-relaxed">
                    "{selectedNode.source_excerpt}"
                  </blockquote>
                ) : (
                  <p className="text-[11px] text-[#536777] dark:text-[#91A3B5] italic">
                    Original OCR coordinates recorded at document ingestion.
                  </p>
                )}
              </div>

              {/* Navigation & Inspection Actions */}
              <div className="space-y-1.5 pt-2">
                {selectedNode.id.startsWith('fact-') && (
                  <>
                    <button
                      onClick={() => handleInspectEvidence(selectedNode)}
                      className="med-btn-primary w-full text-xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Source Excerpt</span>
                    </button>
                    <button
                      onClick={() => handleInspectConfidence(selectedNode)}
                      className="med-btn-secondary w-full text-xs"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-[#0F766E]" />
                      <span>View Confidence Breakdown</span>
                    </button>
                    {onJumpToTimeline && (
                      <button
                        onClick={() => {
                          const factId = parseInt(selectedNode.id.replace('fact-', ''), 10);
                          onJumpToTimeline(factId);
                        }}
                        className="med-btn-secondary w-full text-xs"
                      >
                        <Clock className="w-3.5 h-3.5 text-[#245F91]" />
                        <span>Jump to Timeline Record</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[#536777] dark:text-[#91A3B5] space-y-2">
              <Compass className="w-8 h-8 text-[#536777] mx-auto opacity-40" />
              <p>Select any node or connecting edge in the graph to inspect evidence and clinical provenance.</p>
            </div>
          )}
        </div>
      </div>

      {/* Evidence Provenance Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />

      {/* Confidence Breakdown Modal */}
      <ConfidenceInspectorModal
        confidenceDetail={confidenceDetail}
        isOpen={!!confidenceDetail}
        onClose={() => setConfidenceDetail(null)}
      />
    </div>
  );
};
