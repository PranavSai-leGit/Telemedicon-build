import React, { useState, useMemo, useRef } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  Filter,
  Activity,
  Pill,
  FlaskConical,
  FileText,
  AlertCircle,
  Eye,
  CheckCircle2,
  Calendar,
  Layers,
  Info,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { GraphNode, GraphEdge, RelationshipGraphResponse } from '../types';
import { EvidenceModal } from './EvidenceModal';
import { api } from '../services/api';

interface MedicalRelationshipMapProps {
  graphData: RelationshipGraphResponse | null;
  loading?: boolean;
}

export const MedicalRelationshipMap: React.FC<MedicalRelationshipMapProps> = ({
  graphData,
  loading = false,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [evidenceData, setEvidenceData] = useState<any | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Compute node positions using an organized hierarchical layout
  const { nodePositions, filteredNodes, filteredEdges, connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!graphData || !graphData.nodes.length) {
      return {
        nodePositions: new Map<string, { x: number; y: number }>(),
        filteredNodes: [],
        filteredEdges: [],
        connectedNodeIds: new Set<string>(),
        connectedEdgeIds: new Set<string>(),
      };
    }

    // Filter nodes
    const fNodes = graphData.nodes.filter((node) => {
      const matchesSearch =
        !searchQuery ||
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.document_name && node.document_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = filterType === 'all' || node.type === filterType;
      return matchesSearch && matchesType;
    });

    const activeNodeIdSet = new Set(fNodes.map((n) => n.id));

    // Filter edges
    const fEdges = graphData.edges.filter(
      (edge) => activeNodeIdSet.has(edge.source) && activeNodeIdSet.has(edge.target)
    );

    // Group nodes by category tier
    // Tier 0: Conditions (left / top-left)
    // Tier 1: Medications & Allergies (center)
    // Tier 2: Lab Results & Monitoring (right / top-right)
    // Tier 3: Documents (bottom foundation)
    const conditions = fNodes.filter((n) => n.type === 'condition');
    const medications = fNodes.filter((n) => n.type === 'medication' || n.type === 'allergy');
    const labs = fNodes.filter((n) => n.type === 'lab_result');
    const documents = fNodes.filter((n) => n.type === 'document');
    const others = fNodes.filter((n) => !['condition', 'medication', 'allergy', 'lab_result', 'document'].includes(n.type));

    const positions = new Map<string, { x: number; y: number }>();

    const assignColumn = (items: GraphNode[], xCol: number, yStart = 60, yGap = 130) => {
      items.forEach((item, index) => {
        positions.set(item.id, {
          x: xCol,
          y: yStart + index * yGap,
        });
      });
    };

    assignColumn(conditions, 60, 80, 150);
    assignColumn(medications, 380, 70, 130);
    assignColumn(labs, 700, 80, 140);
    assignColumn(documents, 1020, 70, 130);
    assignColumn(others, 700, 450, 120);

    // Highlight set for selected or hovered node
    const activeTarget = hoveredNodeId || selectedNodeId;
    const connectedNodes = new Set<string>();
    const connectedEdges = new Set<string>();

    if (activeTarget) {
      connectedNodes.add(activeTarget);
      graphData.edges.forEach((edge) => {
        if (edge.source === activeTarget || edge.target === activeTarget) {
          connectedEdges.add(edge.id);
          connectedNodes.add(edge.source);
          connectedNodes.add(edge.target);
        }
      });
    }

    return {
      nodePositions: positions,
      filteredNodes: fNodes,
      filteredEdges: fEdges,
      connectedNodeIds: connectedNodes,
      connectedEdgeIds: connectedEdges,
    };
  }, [graphData, searchQuery, filterType, hoveredNodeId, selectedNodeId]);

  // Mouse pan handlers
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

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  };

  const handleInspectEvidence = async (node: GraphNode) => {
    if (!node.id.startsWith('fact-')) return;
    const factId = parseInt(node.id.replace('fact-', ''), 10);
    if (!isNaN(factId)) {
      try {
        const ev = await api.getFactEvidence(factId);
        setEvidenceData(ev);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const selectedNode = useMemo(
    () => graphData?.nodes.find((n) => n.id === selectedNodeId) || null,
    [graphData, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => graphData?.edges.find((e) => e.id === selectedEdgeId) || null,
    [graphData, selectedEdgeId]
  );

  const getNodeColorConfig = (type: string) => {
    switch (type) {
      case 'condition':
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/40',
          border: 'border-purple-300 dark:border-purple-800',
          text: 'text-purple-900 dark:text-purple-200',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
          icon: Activity,
          accent: '#9333EA',
        };
      case 'medication':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/40',
          border: 'border-teal-300 dark:border-teal-800',
          text: 'text-teal-900 dark:text-teal-200',
          badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
          icon: Pill,
          accent: '#0F766E',
        };
      case 'lab_result':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/40',
          border: 'border-blue-300 dark:border-blue-800',
          text: 'text-blue-900 dark:text-blue-200',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
          icon: FlaskConical,
          accent: '#2563EB',
        };
      case 'allergy':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/40',
          border: 'border-rose-300 dark:border-rose-800',
          text: 'text-rose-900 dark:text-rose-200',
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
          icon: AlertCircle,
          accent: '#E11D48',
        };
      case 'document':
      default:
        return {
          bg: 'bg-slate-50 dark:bg-slate-800/60',
          border: 'border-slate-300 dark:border-slate-700',
          text: 'text-slate-900 dark:text-slate-200',
          badge: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
          icon: FileText,
          accent: '#64748B',
        };
    }
  };

  const getEdgeStroke = (edge: GraphEdge) => {
    if (edge.relationship_type === 'discrepancy_transition') {
      return { stroke: '#D97706', dash: '5,5', width: 2.5 };
    }
    if (edge.relationship_type === 'treatment') {
      return { stroke: '#0F766E', dash: '', width: 2 };
    }
    if (edge.relationship_type === 'biomarker_monitoring') {
      return { stroke: '#2563EB', dash: '4,4', width: 2 };
    }
    return { stroke: '#94A3B8', dash: '2,2', width: 1.5 };
  };

  if (loading) {
    return (
      <div className="p-12 text-center med-card flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-500">Constructing Medical Relationship Map...</p>
      </div>
    );
  }

  if (!graphData || !graphData.nodes.length) {
    return (
      <div className="p-12 text-center med-card space-y-3">
        <Info className="w-8 h-8 text-teal-600 mx-auto" />
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Relationship Records Available</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Medical relationship graphs are constructed from structured diagnoses, prescriptions, and lab tests stored in patient records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls & Filter Bar */}
      <div className="p-4 med-card flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Category Filters */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${graphData.nodes.length})` },
            { id: 'condition', label: `Conditions (${graphData.node_counts['condition'] || 0})` },
            { id: 'medication', label: `Medications (${graphData.node_counts['medication'] || 0})` },
            { id: 'lab_result', label: `Labs (${graphData.node_counts['lab_result'] || 0})` },
            { id: 'document', label: `Documents (${graphData.node_counts['document'] || 0})` },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterType(cat.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${filterType === cat.id ? 'med-btn-primary' : 'med-btn-secondary'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search & Zoom Controls */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
          <div className="relative w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search graph..."
              className="med-input pl-8 py-1 text-xs w-full"
            />
          </div>

          <div className="flex items-center space-x-1 border border-slate-200 dark:border-slate-700 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800/80">
            <button
              onClick={() => setZoom((z) => Math.min(z + 0.15, 2.0))}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(z - 0.15, 0.5))}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative h-[620px] rounded-2xl bg-[#F8FAFC] dark:bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      >
        {/* Background Grid Pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
          <defs>
            <pattern id="medical-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#medical-grid)" />
        </svg>

        {/* Legend Overlay */}
        <div className="absolute top-3 left-3 z-10 p-2.5 rounded-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 text-[11px] space-y-1 shadow-xs pointer-events-auto">
          <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center space-x-1">
            <Layers className="w-3 h-3 text-teal-600" />
            <span>Clinical Node Map</span>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Condition</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Medication</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Lab Test</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Document</span>
          </div>
        </div>

        {/* Medical Safety Disclaimer Pill */}
        <div className="absolute top-3 right-3 z-10 px-3 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/70 border border-amber-200/80 dark:border-amber-800 text-[11px] font-medium text-amber-800 dark:text-amber-300 flex items-center space-x-1.5 shadow-xs pointer-events-auto">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>Informational exploration tool — not a diagnostic engine.</span>
        </div>

        {/* Interactive SVG Container */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="w-[1400px] h-[900px] relative pointer-events-auto"
        >
          {/* SVG Arrowhead Markers & Relationship Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <defs>
              <marker id="arrow-teal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#0F766E" />
              </marker>
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#2563EB" />
              </marker>
              <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#D97706" />
              </marker>
              <marker id="arrow-slate" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#94A3B8" />
              </marker>
            </defs>

            {filteredEdges.map((edge) => {
              const srcPos = nodePositions.get(edge.source);
              const tgtPos = nodePositions.get(edge.target);
              if (!srcPos || !tgtPos) return null;

              const x1 = srcPos.x + 120;
              const y1 = srcPos.y + 35;
              const x2 = tgtPos.x + 120;
              const y2 = tgtPos.y + 35;

              const strokeConfig = getEdgeStroke(edge);
              const isHighlighted = connectedEdgeIds.has(edge.id) || selectedEdgeId === edge.id;
              const isDimmed = (selectedNodeId || hoveredNodeId) && !isHighlighted;

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;

              let markerUrl = 'url(#arrow-slate)';
              if (edge.relationship_type === 'discrepancy_transition') markerUrl = 'url(#arrow-amber)';
              else if (edge.relationship_type === 'treatment') markerUrl = 'url(#arrow-teal)';
              else if (edge.relationship_type === 'biomarker_monitoring') markerUrl = 'url(#arrow-blue)';

              return (
                <g key={edge.id} className="transition-opacity duration-200" style={{ opacity: isDimmed ? 0.2 : 1 }}>
                  {/* Clickable Edge Hitbox */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth="18"
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => {
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  />

                  {/* Visual Edge Line */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={strokeConfig.stroke}
                    strokeWidth={isHighlighted ? 3 : strokeConfig.width}
                    strokeDasharray={strokeConfig.dash}
                    markerEnd={markerUrl}
                  />

                  {/* Centered Edge Label Pill */}
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    className="cursor-pointer pointer-events-auto"
                    onClick={() => {
                      setSelectedEdgeId(edge.id);
                      setSelectedNodeId(null);
                    }}
                  >
                    <rect
                      x="-55"
                      y="-11"
                      width="110"
                      height="22"
                      rx="11"
                      fill={isHighlighted ? '#0F766E' : '#FFFFFF'}
                      stroke={isHighlighted ? '#0F766E' : strokeConfig.stroke}
                      strokeWidth="1"
                      className="shadow-xs"
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fill={isHighlighted ? '#FFFFFF' : '#334155'}
                      fontSize="9.5"
                      fontWeight="600"
                    >
                      {edge.label}
                    </text>
                  </g>
                </g>
              );
            })}
          </svg>

          {/* Render Nodes as Interactive Healthcare Cards */}
          {filteredNodes.map((node) => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const config = getNodeColorConfig(node.type);
            const Icon = config.icon;
            const isSelected = selectedNodeId === node.id;
            const isHighlighted = connectedNodeIds.has(node.id);
            const isDimmed = (selectedNodeId || hoveredNodeId) && !isHighlighted;

            return (
              <div
                key={node.id}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  opacity: isDimmed ? 0.3 : 1,
                }}
                onClick={() => {
                  setSelectedNodeId(node.id);
                  setSelectedEdgeId(null);
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className={`interactive-node absolute w-60 p-3 rounded-xl border transition-all duration-150 cursor-pointer shadow-xs ${config.bg
                  } ${isSelected
                    ? 'ring-2 ring-teal-500 shadow-md scale-102 border-teal-500'
                    : isHighlighted
                      ? 'border-teal-400 dark:border-teal-600 shadow-sm'
                      : config.border
                  }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5 truncate">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                      style={{ backgroundColor: config.accent, color: '#fff' }}
                    >
                      <Icon className="w-3 h-3" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                      {node.category}
                    </span>
                  </div>

                  {node.date && (
                    <span className="text-[9px] font-medium text-slate-400 shrink-0 flex items-center gap-0.5">
                      <Calendar className="w-2.5 h-2.5" /> {node.date}
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-2 leading-snug">
                  {node.label}
                </h4>

                <div className="mt-2 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate max-w-[140px] text-slate-400">
                    {node.document_name ? `Doc: ${node.document_name}` : 'Clinical Record'}
                  </span>
                  <span className="capitalize font-semibold text-teal-600 dark:text-teal-400">
                    {node.verification_status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Edge Explanation Banner */}
      {selectedEdge && (
        <div className="p-4 med-card bg-teal-50/70 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="med-badge med-badge-teal text-xs">
                Relationship: {selectedEdge.label}
              </span>
              <span className="text-xs text-slate-400 font-mono">({selectedEdge.relationship_type})</span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              {selectedEdge.explanation || 'Explicit clinical association derived from validated patient records.'}
            </p>
          </div>
          <button
            onClick={() => setSelectedEdgeId(null)}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selected Node Details Drawer */}
      {selectedNode && (
        <div className="p-5 med-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="med-badge med-badge-teal">{selectedNode.category}</span>
                {selectedNode.date && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Recorded on {selectedNode.date}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {selectedNode.label}
              </h3>
            </div>

            <div className="flex items-center space-x-2">
              {selectedNode.id.startsWith('fact-') && (
                <button
                  onClick={() => handleInspectEvidence(selectedNode)}
                  className="med-btn-primary flex items-center space-x-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect Source Evidence</span>
                </button>
              )}
              <button
                onClick={() => setSelectedNodeId(null)}
                className="med-btn-secondary"
              >
                Close Details
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Structured Medical Data */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Clinical Attributes
              </h4>
              <div className="space-y-1.5 text-xs">
                {Object.entries(selectedNode.details).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                    <span className="font-semibold text-slate-600 dark:text-slate-400 capitalize">
                      {key.replace('_', ' ')}:
                    </span>
                    <span className="text-slate-900 dark:text-white font-medium text-right">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))}
                {Object.keys(selectedNode.details).length === 0 && (
                  <p className="text-slate-400 italic">No additional structured fields.</p>
                )}
              </div>
            </div>

            {/* Source Ground Truth & Excerpt */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/40 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Evidence Provenance
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="font-semibold">{selectedNode.document_name || 'Physical Record'}</span>
                  {selectedNode.source_page && <span>(Page {selectedNode.source_page})</span>}
                </div>
                {selectedNode.source_excerpt ? (
                  <blockquote className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 italic text-[11px] leading-relaxed">
                    "{selectedNode.source_excerpt}"
                  </blockquote>
                ) : (
                  <p className="text-slate-400 text-xs italic">
                    Original source page coordinates and OCR excerpt recorded at ingestion.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ground-Truth Evidence Modal */}
      <EvidenceModal evidence={evidenceData} onClose={() => setEvidenceData(null)} />
    </div>
  );
};
