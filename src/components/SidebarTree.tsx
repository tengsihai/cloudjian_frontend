import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation, useMatch, useNavigate } from 'react-router-dom';
import {
  DeleteOutlined,
  FileTextOutlined,
  FolderOutlined,
  InboxOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { api } from '../lib/api';
import { canNavigate, requestNewNote } from '../lib/events';
import type { DirItem, ShareItem } from '../lib/types';
import { baseName, dirName } from '../lib/paths';

function caret(open: boolean) {
  return open ? '▾' : '▸';
}

function useTreeNavigate() {
  const navigate = useNavigate();
  return (url: string) => {
    if (canNavigate()) navigate(url);
  };
}

function TreeAddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="tree-add"
      title={label}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <PlusOutlined />
    </button>
  );
}

export function MineTree() {
  const go = useTreeNavigate();
  const location = useLocation();
  const currentDir = new URLSearchParams(location.search).get('dir') ?? '';
  const match = useMatch('/notes/:noteId');
  const root = useQuery({
    queryKey: ['dirs', 'mine', ''],
    queryFn: () => api.getDirs({ scope: 'mine', path: '' }),
  });

  if (root.isLoading) {
    return (
      <div className="tree">
        <div className="skeleton" style={{ width: '80%', margin: '8px 10px' }} />
        <div className="skeleton" style={{ width: '62%', margin: '8px 10px' }} />
      </div>
    );
  }

  return (
    <div className="tree">
      <button
        type="button"
        className={`tree-node${!currentDir && !match ? ' on' : ''}`}
        onClick={() => go('/notes')}
      >
        <span className="tree-caret" />
        <InboxOutlined />
        <span className="tree-label">全部笔记</span>
      </button>
      {root.data?.items.map((item) =>
        item.type === 'dir' ? (
          <MineDirNode key={item.path} item={item} depth={0} currentDir={currentDir} activeNote={match?.params.noteId ?? null} />
        ) : (
          <MineNoteNode key={item.path} item={item} depth={0} activeNote={match?.params.noteId ?? null} />
        ),
      )}
      {root.data?.items.length === 0 && <p className="caption" style={{ padding: '8px 10px' }}>还没有目录</p>}
    </div>
  );
}

function MineDirNode({
  item,
  depth,
  currentDir,
  activeNote,
}: {
  item: DirItem;
  depth: number;
  currentDir: string;
  activeNote: string | null;
}) {
  const go = useTreeNavigate();
  const [open, setOpen] = useState(currentDir === item.path || currentDir.startsWith(`${item.path}/`));
  const children = useQuery({
    queryKey: ['dirs', 'mine', item.path],
    queryFn: () => api.getDirs({ scope: 'mine', path: item.path }),
    enabled: open,
  });

  useEffect(() => {
    if (currentDir && (currentDir === item.path || currentDir.startsWith(`${item.path}/`))) {
      setOpen(true);
    }
  }, [currentDir, item.path]);

  function selectDir() {
    setOpen(true);
    if (currentDir !== item.path || !!activeNote) go(`/notes?dir=${encodeURIComponent(item.path)}`);
  }

  return (
    <>
      <div
        className={`tree-node${currentDir === item.path && !activeNote ? ' on' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        role="button"
        tabIndex={0}
        onClick={selectDir}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            selectDir();
          }
        }}
      >
        <button
          type="button"
          className="tree-caret"
          style={{ width: 14 }}
          aria-label={open ? '收起' : '展开'}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          {caret(open)}
        </button>
        <FolderOutlined />
        <span className="tree-label">{item.name}</span>
        <TreeAddButton
          label={`在「${item.name}」下新建笔记`}
          onClick={() => requestNewNote({ dir: item.path })}
        />
      </div>
      {open && children.data?.items.map((child) =>
        child.type === 'dir' ? (
          <MineDirNode
            key={child.path}
            item={child}
            depth={depth + 1}
            currentDir={currentDir}
            activeNote={activeNote}
          />
        ) : (
          <MineNoteNode key={child.path} item={child} depth={depth + 1} activeNote={activeNote} />
        ),
      )}
    </>
  );
}

function MineNoteNode({ item, depth, activeNote }: { item: DirItem; depth: number; activeNote: string | null }) {
  const go = useTreeNavigate();
  return (
    <button
      type="button"
      className={`tree-node${activeNote === item.note_id ? ' on' : ''}`}
      style={{ paddingLeft: 8 + depth * 16 }}
      title={item.path}
      onClick={() => {
        if (activeNote === item.note_id) return;
        go(`/notes/${item.note_id}?dir=${encodeURIComponent(dirName(item.path))}`);
      }}
    >
      <span className="tree-caret" />
      <FileTextOutlined />
      <span className="tree-label">{item.name.replace(/\.md$/, '')}</span>
    </button>
  );
}

export function SharedTree() {
  const go = useTreeNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const currentShare = params.get('share') ?? '';
  const currentDir = params.get('dir') ?? '';
  const match = useMatch('/shared/:noteId');
  const shares = useQuery({
    queryKey: ['shares', 'incoming', 'tree'],
    queryFn: () => api.getShares({ scope: 'incoming', page_size: 50 }),
  });

  if (shares.isLoading) {
    return (
      <div className="tree">
        <div className="skeleton" style={{ width: '80%', margin: '8px 10px' }} />
      </div>
    );
  }

  const items = shares.data?.items ?? [];
  if (items.length === 0) {
    return (
      <div className="tree">
        <p className="caption" style={{ padding: '8px 10px' }}>同事共享给你的内容会出现在这里</p>
      </div>
    );
  }

  return (
    <div className="tree">
      <button
        type="button"
        className={`tree-node${!currentShare && !match ? ' on' : ''}`}
        onClick={() => go('/shared')}
      >
        <span className="tree-caret" />
        <InboxOutlined />
        <span className="tree-label">共享收件箱</span>
      </button>
      {items.map((share) =>
        share.target_type === 'dir' ? (
          <SharedDirNode
            key={share.share_id}
            share={share}
            depth={0}
            currentShare={currentShare}
            currentDir={currentDir}
            activeNote={match?.params.noteId ?? null}
          />
        ) : (
          <button
            key={share.share_id}
            type="button"
            className={`tree-node${match?.params.noteId === share.target_note_id ? ' on' : ''}`}
            title={`${share.owner_name} 共享的笔记`}
            onClick={() => {
              if (match?.params.noteId === share.target_note_id) return;
              go(`/shared/${share.target_note_id}?share=${share.share_id}`);
            }}
          >
            <span className="tree-caret" />
            <FileTextOutlined />
            <span className="tree-label">{share.owner_name} · 共享笔记</span>
          </button>
        ),
      )}
    </div>
  );
}

function SharedDirNode({
  share,
  depth,
  currentShare,
  currentDir,
  activeNote,
}: {
  share: ShareItem;
  depth: number;
  currentShare: string;
  currentDir: string;
  activeNote: string | null;
}) {
  const go = useTreeNavigate();
  const root = share.target_dir ?? '';
  const [open, setOpen] = useState(currentShare === share.share_id);
  const children = useQuery({
    queryKey: ['dirs', 'shared', share.share_id, root],
    queryFn: () => api.getDirs({ scope: 'shared', share_id: share.share_id, path: root }),
    enabled: open,
  });

  useEffect(() => {
    if (currentShare === share.share_id) setOpen(true);
  }, [currentShare, share.share_id]);

  function selectDir() {
    setOpen(true);
    if (currentShare !== share.share_id || currentDir !== root || !!activeNote) {
      go(`/shared?share=${share.share_id}&dir=${encodeURIComponent(root)}`);
    }
  }

  return (
    <>
      <div
        className={`tree-node${currentShare === share.share_id && currentDir === root ? ' on' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        role="button"
        tabIndex={0}
        title={`${share.owner_name} 共享的目录`}
        onClick={selectDir}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            selectDir();
          }
        }}
      >
        <button
          type="button"
          className="tree-caret"
          style={{ width: 14 }}
          aria-label={open ? '收起' : '展开'}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          {caret(open)}
        </button>
        <FolderOutlined />
        <span className="tree-label">{baseName(root)}</span>
        <span className={`badge ${share.level === 'edit' ? 'ok' : 'warn'}`}>
          {share.level === 'edit' ? '可编辑' : '只读'}
        </span>
        {share.level === 'edit' && (
          <TreeAddButton
            label={`在「${baseName(root)}」下新建笔记`}
            onClick={() => requestNewNote({ dir: root, shareId: share.share_id })}
          />
        )}
      </div>
      {open && children.data?.items.map((child) =>
        child.type === 'dir' ? (
          <SharedChildDir
            key={child.path}
            item={child}
            depth={depth + 1}
            currentShare={currentShare}
            currentDir={currentDir}
            activeNote={activeNote}
          />
        ) : (
          <button
            key={child.path}
            type="button"
            className={`tree-node${activeNote === child.note_id ? ' on' : ''}`}
            style={{ paddingLeft: 8 + (depth + 1) * 16 }}
            onClick={() => {
              if (activeNote === child.note_id) return;
              go(
                `/shared/${child.note_id}?share=${child.share_id ?? share.share_id}&dir=${encodeURIComponent(dirName(child.path))}`,
              );
            }}
          >
            <span className="tree-caret" />
            <FileTextOutlined />
            <span className="tree-label">{child.name.replace(/\.md$/, '')}</span>
          </button>
        ),
      )}
    </>
  );
}

function SharedChildDir({
  item,
  depth,
  currentShare,
  currentDir,
  activeNote,
}: {
  item: DirItem;
  depth: number;
  currentShare: string;
  currentDir: string;
  activeNote: string | null;
}) {
  const go = useTreeNavigate();
  const shareId = item.share_id ?? currentShare;
  const [open, setOpen] = useState(currentDir === item.path);
  const children = useQuery({
    queryKey: ['dirs', 'shared', shareId, item.path],
    queryFn: () => api.getDirs({ scope: 'shared', share_id: shareId, path: item.path }),
    enabled: open,
  });

  useEffect(() => {
    if (
      currentShare === shareId &&
      currentDir &&
      (currentDir === item.path || currentDir.startsWith(`${item.path}/`))
    ) {
      setOpen(true);
    }
  }, [currentDir, currentShare, item.path, shareId]);

  function selectDir() {
    setOpen(true);
    if (currentShare !== shareId || currentDir !== item.path || !!activeNote) {
      go(`/shared?share=${shareId}&dir=${encodeURIComponent(item.path)}`);
    }
  }

  return (
    <>
      <div
        className={`tree-node${currentShare === shareId && currentDir === item.path ? ' on' : ''}`}
        style={{ paddingLeft: 8 + depth * 16 }}
        role="button"
        tabIndex={0}
        onClick={selectDir}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            selectDir();
          }
        }}
      >
        <button
          type="button"
          className="tree-caret"
          style={{ width: 14 }}
          aria-label={open ? '收起' : '展开'}
          onClick={(event) => {
            event.stopPropagation();
            setOpen((prev) => !prev);
          }}
        >
          {caret(open)}
        </button>
        <FolderOutlined />
        <span className="tree-label">{item.name}</span>
        {item.level === 'edit' && (
          <TreeAddButton
            label={`在「${item.name}」下新建笔记`}
            onClick={() => requestNewNote({ dir: item.path, shareId })}
          />
        )}
      </div>
      {open && children.data?.items.map((child) =>
        child.type === 'dir' ? (
          <SharedChildDir
            key={child.path}
            item={child}
            depth={depth + 1}
            currentShare={currentShare}
            currentDir={currentDir}
            activeNote={activeNote}
          />
        ) : (
          <button
            key={child.path}
            type="button"
            className={`tree-node${activeNote === child.note_id ? ' on' : ''}`}
            style={{ paddingLeft: 8 + (depth + 1) * 16 }}
            onClick={() => {
              if (activeNote === child.note_id) return;
              go(
                `/shared/${child.note_id}?share=${child.share_id ?? currentShare}&dir=${encodeURIComponent(dirName(child.path))}`,
              );
            }}
          >
            <span className="tree-caret" />
            <FileTextOutlined />
            <span className="tree-label">{child.name.replace(/\.md$/, '')}</span>
          </button>
        ),
      )}
    </>
  );
}

export function TrashTree() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = new URLSearchParams(location.search).get('path') ?? '';
  const trash = useQuery({ queryKey: ['trash'], queryFn: () => api.getTrash() });

  if (trash.isLoading) {
    return <div className="tree"><div className="skeleton" style={{ width: '80%', margin: '8px 10px' }} /></div>;
  }
  const items = trash.data?.items ?? [];
  const dirs = items.filter((item) => item.type === 'dir');
  const notes = items.filter((item) => item.type === 'note');

  return (
    <div className="tree">
      <button
        type="button"
        className={`tree-node${!current ? ' on' : ''}`}
        onClick={() => navigate('/trash')}
      >
        <span className="tree-caret" />
        <DeleteOutlined />
        <span className="tree-label">全部内容</span>
        <span className="count">{trash.data?.total ?? 0}</span>
      </button>
      {dirs.map((dir) => (
        <button
          key={dir.path}
          type="button"
          className={`tree-node${current === dir.path ? ' on' : ''}`}
          title={dir.path}
          onClick={() => navigate(`/trash?path=${encodeURIComponent(dir.path)}`)}
        >
          <span className="tree-caret" />
          <FolderOutlined />
          <span className="tree-label">{dir.name}</span>
        </button>
      ))}
      {notes.map((note) => (
        <button
          key={note.note_id ?? note.path}
          type="button"
          className={`tree-node${current === note.path ? ' on' : ''}`}
          title={note.path}
          onClick={() => navigate(`/trash?path=${encodeURIComponent(note.path)}`)}
        >
          <span className="tree-caret" />
          <FileTextOutlined />
          <span className="tree-label">{note.name.replace(/\.md$/, '')}</span>
        </button>
      ))}
      {items.length === 0 && <p className="caption" style={{ padding: '8px 10px' }}>回收站是空的</p>}
    </div>
  );
}
