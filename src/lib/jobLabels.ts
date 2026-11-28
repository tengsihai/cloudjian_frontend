/** 异步任务类型 → 任务中心文案；type 为固定枚举，只增不改（04-接口文档「任务进度」）。 */
export const JOB_TYPE_LABELS: Record<string, string> = {
  move_dir: '正在移动目录…',
  trash_dir: '正在将目录移入回收站…',
  restore_dir: '正在恢复…',
  visibility_migrate: '正在迁移图片可见性…',
  purge_note: '正在彻底删除笔记…',
  purge_notes: '正在批量彻底删除…',
  purge_dir: '正在彻底删除目录…',
  purge_all: '正在清空回收站…',
  delete_user: '正在删除用户并清理数据…',
  export_dir: '正在导出目录…',
  rebuild_index: '正在重建索引…',
};

export function jobLabel(type: string): string {
  return JOB_TYPE_LABELS[type] ?? '处理中…';
}
