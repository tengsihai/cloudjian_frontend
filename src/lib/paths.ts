export function baseName(path: string) {
  const parts = path.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? path;
}

export function dirName(path: string) {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function joinPath(...parts: Array<string | null | undefined>) {
  return parts
    .filter((part): part is string => !!part)
    .join('/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/|\/$/g, '');
}

/** 共享内容的展示位置：根用共享名，子目录用「共享名/相对路径」，note 级共享显示「共享笔记」。 */
export function sharedLocation(relativePath: string | null | undefined, shareRootName: string | null | undefined) {
  if (relativePath === null) return '共享笔记';
  if (!shareRootName) return relativePath || '';
  if (!relativePath) return shareRootName;
  return `${shareRootName}/${relativePath}`;
}
