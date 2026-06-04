import { describe, it, expect, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotePanel from '../NotePanel';

const mockNotes = [
  { id: 1, title: 'First Note', content: 'Hello', updated_at: '2026-06-01T10:00:00', created_at: '2026-05-01T10:00:00' },
  { id: 2, title: 'Second Note', content: 'World', updated_at: '2026-06-02T10:00:00', created_at: '2026-05-02T10:00:00' },
  { id: 3, title: 'Third Note', content: 'Test', updated_at: '2026-06-03T10:00:00', created_at: '2026-05-03T10:00:00' },
];

function renderNotePanel(overrides = {}) {
  const defaultProps = {
    notes: mockNotes,
    selectedNoteId: null,
    pagination: { page: 1, totalPages: 1, total: 3, limit: 20 },
    sort: 'updated_at',
    order: 'desc',
    onSelectNote: vi.fn(),
    onCreateNote: vi.fn(),
    onDeleteNote: vi.fn(),
    onSearch: vi.fn(),
    onSortChange: vi.fn(),
    onPageChange: vi.fn(),
    ...overrides,
  };
  return { ...render(<NotePanel {...defaultProps} />), props: defaultProps };
}

describe('NotePanel', () => {
  describe('笔记列表显示', () => {
    it('渲染笔记列表', () => {
      renderNotePanel();
      expect(screen.getByText('First Note')).toBeInTheDocument();
      expect(screen.getByText('Second Note')).toBeInTheDocument();
      expect(screen.getByText('Third Note')).toBeInTheDocument();
    });

    it('空列表时显示空状态', () => {
      renderNotePanel({ notes: [] });
      expect(screen.getByText(/暂无笔记/)).toBeInTheDocument();
    });

    it('选中的笔记高亮', () => {
      renderNotePanel({ selectedNoteId: 1 });
      const deleteButtons = screen.getAllByTitle('删除笔记');
      const selectedItem = deleteButtons[0].closest('.note-item');
      expect(selectedItem).toHaveClass('selected');
    });
  });

  describe('新建笔记', () => {
    it('点击新建按钮触发回调', async () => {
      const { props } = renderNotePanel();
      const user = userEvent.setup();
      await user.click(screen.getByText('+ 新建笔记'));
      expect(props.onCreateNote).toHaveBeenCalledTimes(1);
    });
  });

  describe('排序功能', () => {
    it('显示排序选择器', () => {
      renderNotePanel();
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
    });

    it('默认值为最后修改降序', () => {
      renderNotePanel();
      const select = screen.getByRole('combobox');
      expect(select.value).toBe('updated_at::desc');
    });

    it('切换排序触发回调', async () => {
      const { props } = renderNotePanel();
      const user = userEvent.setup();
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'created_at::asc');
      expect(props.onSortChange).toHaveBeenCalledWith('created_at', 'asc');
    });
  });

  describe('分页功能', () => {
    it('多页时显示分页控件', () => {
      renderNotePanel({
        pagination: { page: 1, totalPages: 3, total: 60, limit: 20 },
      });
      expect(screen.getByText('1 / 3')).toBeInTheDocument();
    });

    it('单页时隐藏分页控件', () => {
      renderNotePanel({
        pagination: { page: 1, totalPages: 1, total: 3, limit: 20 },
      });
      expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument();
    });

    it('第一页时上一页按钮禁用', () => {
      renderNotePanel({
        pagination: { page: 1, totalPages: 3, total: 60, limit: 20 },
      });
      const buttons = screen.getAllByRole('button');
      const prevBtn = buttons.find((b) => b.textContent === '上一页');
      expect(prevBtn).toBeDisabled();
    });

    it('最后一页时下一页按钮禁用', () => {
      renderNotePanel({
        pagination: { page: 3, totalPages: 3, total: 60, limit: 20 },
      });
      const buttons = screen.getAllByRole('button');
      const nextBtn = buttons.find((b) => b.textContent === '下一页');
      expect(nextBtn).toBeDisabled();
    });

    it('点击下一页触发回调', async () => {
      const { props } = renderNotePanel({
        pagination: { page: 1, totalPages: 3, total: 60, limit: 20 },
      });
      const user = userEvent.setup();
      const nextBtn = screen.getByText('下一页');
      await user.click(nextBtn);
      expect(props.onPageChange).toHaveBeenCalledWith(2);
    });

    it('点击上一页触发回调', async () => {
      const { props } = renderNotePanel({
        pagination: { page: 2, totalPages: 3, total: 60, limit: 20 },
      });
      const user = userEvent.setup();
      const prevBtn = screen.getByText('上一页');
      await user.click(prevBtn);
      expect(props.onPageChange).toHaveBeenCalledWith(1);
    });
  });

  describe('搜索功能', () => {
    it('显示搜索输入框', () => {
      renderNotePanel();
      expect(screen.getByPlaceholderText('搜索笔记...')).toBeInTheDocument();
    });

    it('输入搜索词触发防抖回调', () => {
      vi.useFakeTimers();
      const { props } = renderNotePanel();
      const input = screen.getByPlaceholderText('搜索笔记...');
      fireEvent.change(input, { target: { value: 'test' } });
      // 防抖 300ms，立即不应触发
      expect(props.onSearch).not.toHaveBeenCalledWith('test');
      vi.advanceTimersByTime(300);
      expect(props.onSearch).toHaveBeenCalledWith('test');
      vi.useRealTimers();
    });
  });

  describe('删除笔记', () => {
    it('点击删除按钮触发回调', () => {
      const { props } = renderNotePanel();
      const deleteButtons = screen.getAllByTitle('删除笔记');
      fireEvent.click(deleteButtons[0]);
      expect(props.onDeleteNote).toHaveBeenCalledWith(1);
    });
  });
});
