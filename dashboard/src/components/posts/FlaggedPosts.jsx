import { useState, useEffect, useCallback } from 'react';
import {
  Filter, Calendar, BarChart2, CheckCircle, XCircle, Eye,
  ChevronDown, Download, Search, RefreshCw, AlertCircle, ExternalLink
} from 'lucide-react';
import Badge from '../ui/Badge';
import ProgressBar from '../ui/ProgressBar';
import clsx from 'clsx';
import { getPosts, refreshPosts } from '../../api';

// ─── Blur overlay shown over high-risk posts ──────────────────────────────────
function BlurOverlay({ post, onReveal, onViewAnalysis }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(255,241,242,0.7)' }}>
      <div className="text-center p-4">
        <div className="text-2xl mb-1">⚠️</div>
        <p className="text-xs font-bold text-red-700 mb-2">Potential Misinformation</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={onViewAnalysis}
            className="px-2 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700 transition-colors font-medium">
            View Analysis
          </button>
          <button
            onClick={onReveal}
            className="px-2 py-1 bg-white border border-gray-300 text-gray-600 text-xs rounded-md hover:bg-gray-50 transition-colors font-medium">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Analysis Modal ───────────────────────────────────────────────────────────
function AnalysisModal({ post, onClose }) {
  if (!post) return null;
  const risk = post.fakeScore || 0;
  const accentColor = risk >= 70 ? '#e11d48' : risk >= 40 ? '#f59e0b' : '#10b981';
  const bgColor = risk >= 70 ? '#fff1f2' : risk >= 40 ? '#fffbeb' : '#ecfdf5';
  const verdict = post.verdict || (risk >= 70 ? 'FAKE' : risk >= 40 ? 'MISLEADING' : 'SAFE');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3 font-bold text-gray-900">
            <div className="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            ShieldNet Analysis
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Verdict + Score card */}
          <div className="rounded-xl p-5 relative overflow-hidden"
            style={{ background: bgColor, border: `1px solid ${accentColor}33` }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10"
              style={{ background: accentColor, filter: 'blur(40px)', transform: 'translate(30%, -30%)' }} />
            <div className="flex justify-between items-center mb-3 relative z-10">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: `${accentColor}99` }}>Verdict</div>
                <div className="text-2xl font-extrabold" style={{ color: accentColor }}>{verdict}</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: `${accentColor}99` }}>Risk Score</div>
                <div className="text-4xl font-black leading-none" style={{ color: accentColor }}>{risk}%</div>
              </div>
            </div>
            <div className="h-2 bg-black/5 rounded-full overflow-hidden relative z-10">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${risk}%`, background: accentColor }} />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2 font-medium relative z-10">
              <span>{post.analyzedBy === 'gemini' ? 'Gemini AI Analysis' : 'Local Pre-Filter'}</span>
              <span>Confidence: {post.confidence || post.aiConfidence ? `${post.aiConfidence}%` : 'Medium'}</span>
            </div>
          </div>

          {/* Content */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Post Content</div>
            <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border border-gray-100">
              {post.content}
            </p>
          </div>

          {/* Explanation */}
          {post.explanation && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Analysis</div>
              <p className="text-sm text-gray-600 leading-relaxed">{post.explanation}</p>
            </div>
          )}

          {/* Sources */}
          {post.verified_sources?.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Sources</div>
              <div className="space-y-2">
                {post.verified_sources.map((src, i) => {
                  let hostname = '#';
                  try { hostname = new URL(src.url).hostname.replace('www.', ''); } catch (_) {}
                  return (
                    <a key={i} href={src.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-100 transition-all no-underline">
                      <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-800 truncate">{src.title}</div>
                        <div className="text-xs text-gray-500">{hostname}</div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reddit link */}
          {post.url && (
            <a href={post.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              <ExternalLink className="w-3 h-3" />
              View original post on Reddit
            </a>
          )}
        </div>

        <div className="p-4 border-t border-gray-100">
          <button onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function FlaggedPosts() {
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterPlatform, setFilterPlatform] = useState('All');
  const [filterScore, setFilterScore]   = useState('All');
  const [page, setPage]                 = useState(1);
  const [modalPost, setModalPost]       = useState(null);
  const [revealed, setRevealed]         = useState(new Set()); // ids dismissed from blur
  const [meta, setMeta]                 = useState({});

  // Determine if a post should be blurred
  const isBlurred = (post) =>
    (post.fakeScore || 0) >= 70 && !revealed.has(post.id);

  const reveal    = (id) => setRevealed(prev => new Set([...prev, id]));
  const hideModal = ()   => setModalPost(null);

  const loadPosts = useCallback(async (forceRefresh = false) => {
    try {
      forceRefresh ? setRefreshing(true) : setLoading(true);
      setError(null);
      const data = await getPosts({ limit: 300, refresh: forceRefresh });
      setPosts(data.posts || []);
      setMeta({ total: data.total, cached: data.cached, freshlyAnalysed: data.freshlyAnalysed });
      setPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  // ─── Filtering ───────────────────────────────────────────────────────────────
  const platforms = ['All', ...new Set(posts.map(p => p.platform))];

  const filtered = posts.filter(post => {
    const matchSearch = !searchTerm ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchPlatform = filterPlatform === 'All' || post.platform === filterPlatform;

    const score = post.fakeScore || 0;
    const matchScore =
      filterScore === 'All' ? true :
      filterScore === 'High'   ? score >= 70 :
      filterScore === 'Medium' ? score >= 40 && score < 70 :
      filterScore === 'Low'    ? score < 40 : true;

    return matchSearch && matchPlatform && matchScore;
  });

  const totalPages   = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated    = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const flaggedCount = posts.filter(p => (p.fakeScore || 0) >= 35).length;

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Fetching real posts from Reddit &amp; running AI analysis…</p>
        <p className="text-xs text-gray-400">First load may take 20–30s while Gemini analyses new posts</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <div>
          <p className="text-red-600 font-semibold">Failed to load posts</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
          <p className="text-gray-400 text-xs mt-1">Make sure the backend is running on port 5000</p>
        </div>
        <button onClick={() => loadPosts()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {modalPost && <AnalysisModal post={modalPost} onClose={hideModal} />}

      <div className="flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Flagged Misinformation</h2>
            <p className="text-gray-500 mt-1">
              {posts.length} real Reddit posts analysed ·&nbsp;
              <span className="text-red-600 font-semibold">{flaggedCount} flagged</span>
              {meta.freshlyAnalysed > 0 && (
                <span className="text-gray-400 ml-2 text-xs">
                  ({meta.freshlyAnalysed} newly analysed, {meta.cached} from cache)
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => loadPosts(true)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50">
              <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
              {refreshing ? 'Refreshing…' : 'Refresh Posts'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">

          {/* Filter Bar */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-wrap gap-4 items-center justify-between">
            <div className="relative max-w-md w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search post content or author…"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  value={filterPlatform}
                  onChange={e => { setFilterPlatform(e.target.value); setPage(1); }}
                  className="appearance-none flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 pr-8 cursor-pointer">
                  {platforms.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={filterScore}
                  onChange={e => { setFilterScore(e.target.value); setPage(1); }}
                  className="appearance-none flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 pr-8 cursor-pointer">
                  <option value="All">All Scores</option>
                  <option value="High">High Risk (≥70%)</option>
                  <option value="Medium">Medium (40–69%)</option>
                  <option value="Low">Low (&lt;40%)</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Status Legend */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-6 bg-white">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</span>
            {[['bg-red-500','Flagged (≥70%)'],['bg-amber-500','Under Review (40-69%)'],['bg-emerald-500','Cleared (<40%)']].map(([c,l])=>(
              <div key={l} className="flex items-center gap-2 text-sm text-gray-600">
                <span className={`w-2 h-2 rounded-full ${c}`}></span>{l}
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                  <th className="px-6 py-4 w-2/5">Post Content</th>
                  <th className="px-6 py-4">Platform</th>
                  <th className="px-6 py-4 text-center">Fake Score</th>
                  <th className="px-6 py-4">AI Confidence</th>
                  <th className="px-6 py-4 text-center">Comments</th>
                  <th className="px-6 py-4">Posted</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      No posts match your filter criteria.
                    </td>
                  </tr>
                ) : paginated.map(post => {
                  const blurred = isBlurred(post);
                  return (
                    <tr key={post.id} className="hover:bg-gray-50 transition-colors group">
                      {/* Content cell — blur overlay for high-risk */}
                      <td className="px-6 py-4">
                        <div className="relative">
                          {blurred && (
                            <BlurOverlay
                              post={post}
                              onReveal={() => reveal(post.id)}
                              onViewAnalysis={() => setModalPost(post)}
                            />
                          )}
                          <p className={clsx(
                            'text-sm font-medium text-gray-900 line-clamp-2 max-w-xs',
                            blurred && 'blur-sm select-none'
                          )}>
                            {post.content}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">by u/{post.author}</p>
                        </div>
                      </td>

                      {/* Platform */}
                      <td className="px-6 py-4">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-1 rounded-md text-xs font-bold',
                          post.platformColor
                        )}>
                          {post.platform}
                        </span>
                      </td>

                      {/* Fake Score */}
                      <td className="px-6 py-4 text-center">
                        {post.fakeScore !== null ? (
                          <span className={clsx('text-sm font-bold px-2 py-1 rounded-md',
                            post.fakeScore >= 70 ? 'bg-red-50 text-red-600' :
                            post.fakeScore >= 40 ? 'bg-amber-50 text-amber-600' :
                            'bg-gray-100 text-gray-600'
                          )}>
                            {post.fakeScore}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>

                      {/* AI Confidence bar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <ProgressBar
                            progress={post.aiConfidence || 0}
                            className="w-full"
                            color={(post.aiConfidence || 0) > 75 ? 'bg-blue-600' : 'bg-blue-400'}
                          />
                          <span className="text-xs font-semibold text-gray-700 w-8">
                            {post.aiConfidence || 0}%
                          </span>
                        </div>
                      </td>

                      {/* Comments */}
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-gray-600 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                          {post.reports?.toLocaleString() || 0}
                        </span>
                      </td>

                      {/* Timestamp */}
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">{post.timestamp || '—'}</span>
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4 text-center">
                        <Badge variant={post.statusVariant} className="font-bold">
                          {post.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setModalPost(post)}
                            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-colors"
                            title="View Analysis">
                            <Eye className="w-4 h-4" />
                          </button>
                          {post.url && (
                            <a href={post.url} target="_blank" rel="noreferrer"
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-indigo-600 transition-colors"
                              title="Open on Reddit">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button className="p-1.5 hover:bg-green-50 rounded text-gray-500 hover:text-green-600 transition-colors" title="Mark Safe">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600 transition-colors" title="Remove Content">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 bg-gray-50/50 flex justify-between items-center text-sm">
            <span className="text-gray-500">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} posts
            </span>
            <div className="flex gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm">
                Previous
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const n = i + 1;
                return (
                  <button key={n} onClick={() => setPage(n)}
                    className={clsx('px-3 py-1 border rounded text-sm',
                      page === n
                        ? 'border-blue-600 bg-blue-600 text-white font-medium'
                        : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                    )}>
                    {n}
                  </button>
                );
              })}
              {totalPages > 7 && <span className="px-2 py-1 text-gray-400">…</span>}
              <button
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-300 rounded bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 text-sm">
                Next
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
