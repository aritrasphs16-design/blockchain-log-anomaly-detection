"use client";

import { useSSE } from './SSEProvider';
import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link as LinkIcon, Database, CheckCircle2, ChevronLeft, ChevronRight, ArrowRight, ExternalLink, RotateCcw } from 'lucide-react';
import Link from 'next/link';

export function BlockchainVisualizer() {
  const { hash, cid, evidenceBatches, resetLedger, setEvidenceBatches } = useSSE();
  const [liveBlocks, setLiveBlocks] = useState([]);
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Compile full list of blocks (historical + live incoming)
  const allBlocks = useMemo(() => {
    if (evidenceBatches && evidenceBatches.length > 0) {
      // Reverse so oldest is on the left and newest is on the right
      return [...evidenceBatches].reverse().map((b, i) => ({
        id: b.id || b.batchId || (i + 1),
        batchId: b.id || b.batchId || (i + 1),
        cid: b.cid,
        hash: b.root || b.hash,
        timestamp: b.time || (b.timestamp ? new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Just now"),
        eventsCount: b.eventsCount || b.eventsData?.length || 0,
        status: b.status || "VERIFIED"
      }));
    }
    return liveBlocks;
  }, [evidenceBatches, liveBlocks]);

  // Handle incoming live block streaming if evidenceBatches hasn't updated yet
  useEffect(() => {
    if (cid !== "N/A" && hash !== "0x0000...0000") {
      setLiveBlocks(prev => {
        if (prev.some(b => b.cid === cid || b.hash === hash)) return prev;
        const newBlock = {
          id: Date.now().toString().slice(-4),
          batchId: Date.now().toString().slice(-4),
          cid,
          hash,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          eventsCount: 1,
          status: "VERIFIED"
        };
        return [...prev, newBlock];
      });
    }
  }, [cid, hash]);

  // Check scroll positions for enabling/disabling buttons
  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [allBlocks.length]);

  // Auto-scroll to latest block when new block anchors
  useEffect(() => {
    if (scrollRef.current && allBlocks.length > 0) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  }, [allBlocks.length]);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollOffset = 260; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollOffset : scrollOffset,
        behavior: 'smooth'
      });
      setTimeout(checkScroll, 300);
    }
  };

  return (
    <div className="card-glass w-full h-full flex flex-col p-4 relative overflow-hidden">
      
      {/* Header with Title, Counts, and Scrolling Controls */}
      <div className="row between shrink-0" style={{ marginBottom: '0.75rem', zIndex: 10 }}>
        <div className="row row-2" style={{ minWidth: 0 }}>
          <p className="section-label row row-2" style={{ color: 'var(--text-secondary)' }}>
            <LinkIcon size={12} style={{ color: 'var(--accent)' }} /> Cryptographic Ledger
          </p>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold shrink-0" style={{ background: 'var(--accent-bg)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }}>
            {allBlocks.length} {allBlocks.length === 1 ? 'block' : 'blocks'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {allBlocks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLiveBlocks([]);
                if (resetLedger) resetLedger();
                else if (setEvidenceBatches) setEvidenceBatches([]);
              }}
              className="text-[10px] font-bold px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 hover:text-white"
              style={{
                background: 'var(--bg-inset)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
              title="Clear all anchored blocks from ledger"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          )}

          <Link 
            href="/evidence"
            className="text-[10px] font-bold transition-colors flex items-center gap-1 hover:text-cyan-400"
            style={{ color: 'var(--text-muted)' }}
            title="View complete evidence archives"
          >
            <span className="topbar-hide-sm">All Batches</span> <ArrowRight size={10} />
          </Link>

          {/* Left Scroll Button */}
          <button
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            className="p-1 rounded-md transition-all cursor-pointer"
            style={{ 
              background: canScrollLeft ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              color: canScrollLeft ? 'var(--text-primary)' : 'var(--text-muted)',
              opacity: canScrollLeft ? 1 : 0.4
            }}
            title="Scroll left to see earlier anchored blocks"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Right Scroll Button */}
          <button
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            className="p-1 rounded-md transition-all cursor-pointer"
            style={{ 
              background: canScrollRight ? 'var(--bg-elevated)' : 'rgba(255,255,255,0.02)',
              border: '1px solid var(--border-subtle)',
              color: canScrollRight ? 'var(--text-primary)' : 'var(--text-muted)',
              opacity: canScrollRight ? 1 : 0.4
            }}
            title="Scroll right to see recent anchored blocks"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Horizontal Scrollable Blocks Ledger */}
      <div 
        ref={scrollRef}
        className="flex-1 flex items-center overflow-x-auto overflow-y-hidden relative pl-2 pr-4 scroll-smooth min-h-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {/* Background decorative chain line */}
        <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 z-0 pointer-events-none" style={{ background: 'rgba(148,163,184,0.08)' }}></div>

        <AnimatePresence mode="popLayout">
          {allBlocks.map((block, idx) => (
            <motion.div
              key={block.batchId || block.id || idx}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
              className="relative z-10 flex items-center shrink-0"
            >
              {/* Chain Link (except first block) */}
              {idx > 0 && (
                <div className="w-5 h-[2px] shrink-0" style={{ background: 'linear-gradient(90deg, var(--accent-strong), var(--accent))', boxShadow: '0 0 6px rgba(56,189,248,0.4)' }}></div>
              )}
              
              {/* Block Card */}
              <div 
                className="w-52 rounded-xl p-3 flex flex-col gap-2 shrink-0 transition-all duration-200 group"
                style={{ 
                  background: 'var(--bg-elevated)', 
                  border: '1px solid var(--border-subtle)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                <div className="flex justify-between items-center pb-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black mono-data group-hover:text-cyan-400 transition-colors" style={{ color: 'var(--text-primary)' }}>
                      Block #{block.id}
                    </span>
                    {block.eventsCount > 0 && (
                      <span className="text-[8px] px-1.5 py-0.2 rounded-full font-bold mono-data" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
                        {block.eventsCount} logs
                      </span>
                    )}
                  </div>
                  <span className="text-[9px] mono-data" style={{ color: 'var(--text-muted)' }}>{block.timestamp}</span>
                </div>
                
                <div className="space-y-1.5 text-left">
                  <div>
                    <div className="flex items-center gap-1 text-[8px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      <Database size={9} style={{ color: '#f59e0b' }} /> IPFS CID
                    </div>
                    <div className="text-[9px] mono-data px-1.5 py-0.5 rounded truncate mt-0.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }} title={block.cid}>
                      {block.cid}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1 text-[8px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                      <CheckCircle2 size={9} style={{ color: '#10b981' }} /> Merkle Root
                    </div>
                    <div className="text-[9px] mono-data px-1.5 py-0.5 rounded truncate mt-0.5" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)', color: 'var(--ok)' }} title={block.hash}>
                      {block.hash}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[9px]" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="font-bold flex items-center gap-1" style={{ color: 'var(--ok)' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--ok)' }} /> Verified On-Chain
                  </span>
                  <Link
                    href={`/evidence/${block.batchId || block.id}`}
                    className="font-bold flex items-center gap-1 transition-colors"
                    style={{ color: 'var(--accent)' }}
                    title={`Inspect logs in Block #${block.id}`}
                  >
                    Inspect <ExternalLink size={9} />
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
          
          {allBlocks.length === 0 && (
            <div className="text-xs italic px-4 py-3 rounded-lg z-10" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              Waiting for evidence batches to be anchored to the blockchain...
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
