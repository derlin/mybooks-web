<template>
  <div class="table-scroll">
    <table class="books-table">
      <thead>
        <tr>
          <th
            v-for="column in columns"
            :key="column.id"
            @click="toggleSort(column.id)"
            :class="{ sortable: column.enableSorting }"
          >
            <div class="header-cell">
              {{ column.header }}
              <span v-if="currentSort.id === column.id" class="sort-indicator">
                {{ currentSort.desc ? '▼' : '▲' }}
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in books"
          :key="row._key"
          class="table-row"
          :class="{ audiobook: row.meta?.duration, selected: row._key === selectedBookKey }"
          @click="openDrawer(row)"
        >
          <td>{{ row.author || '—' }}</td>
          <td>{{ row.title }}</td>
          <td>{{ row.date || '—' }}</td>
          <td class="duration-cell">
            {{ row.meta?.duration ? formatDuration(row.meta?.duration) : '—' }}
          </td>
          <td class="pages-cell">
            {{ row.meta?.pages || '—' }}
          </td>
          <td class="boolean-cell">
            <span v-if="row.dnf" class="badge dnf">DNF</span>
          </td>
          <td class="actions-cell">
            <button class="action-btn edit-btn" title="Edit" @click.stop="openEdit(row)">✎</button>
            <button class="action-btn delete-btn" title="Delete" @click.stop="deleteBook(row)">×</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import type { Book } from '../types';
import { formatDuration } from '../utils/formatting';

type Column = {
  id: string;
  header: string;
  enableSorting: boolean;
};

defineProps<{
  books: Book[];
  currentSort: { id: string; desc: boolean };
  selectedBookKey?: string;
}>();

const columns: Column[] = [
  { id: 'author', header: 'Author', enableSorting: true },
  { id: 'title', header: 'Title', enableSorting: true },
  { id: 'date', header: 'Read', enableSorting: true },
  { id: 'duration', header: 'Duration', enableSorting: true },
  { id: 'pages', header: 'Pages', enableSorting: true },
  { id: 'dnf', header: 'DNF?', enableSorting: true },
  { id: 'actions', header: 'Actions', enableSorting: false },
];

const emit = defineEmits<{
  'toggle-sort': [columnId: string];
  'open-drawer': [book: Book];
  'open-edit': [book: Book];
  'delete': [book: Book];
}>();

const toggleSort = (columnId: string) => {
  emit('toggle-sort', columnId);
};

const openDrawer = (book: Book) => {
  emit('open-drawer', book);
};

const openEdit = (book: Book) => {
  emit('open-edit', book);
};

const deleteBook = (book: Book) => {
  emit('delete', book);
};
</script>

<style scoped>
.table-scroll {
  flex: 1;
  overflow-y: auto;
  border-radius: 4px;
  padding: 0 1.5rem;
}

.books-table {
  width: 100%;
  border-collapse: collapse;
}

.books-table thead {
  background-color: var(--bg-primary);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.books-table th {
  padding: 1rem;
  text-align: left;
  color: var(--accent-primary);
  font-weight: 600;
  user-select: none;
}

.books-table th.sortable {
  cursor: pointer;
}

.header-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sort-indicator {
  font-size: 0.7rem;
  opacity: 0.7;
}

.books-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background-color 0.15s;
  cursor: pointer;
}

.books-table tbody tr.audiobook {
  background-color: var(--bg-audiobook);
}

.books-table tbody tr.audiobook:hover {
  background-color: rgba(33, 150, 243, 0.28);
}

.books-table tbody tr:not(.audiobook):hover {
  background-color: var(--bg-hover);
}

.books-table tbody tr:last-child {
  border-bottom: none;
}

.books-table td {
  padding: 1rem;
  color: var(--text-primary);
}

.duration-cell,
.pages-cell,
.boolean-cell {
  text-align: center;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.badge.dnf {
  background-color: rgba(255, 107, 107, 0.2);
  color: var(--warning);
}

.actions-cell {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
}

.action-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.3rem 0.4rem;
  cursor: pointer;
  font-size: 1rem;
  color: var(--accent-primary);
  opacity: 0.7;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.action-btn:hover {
  opacity: 1;
  background-color: var(--bg-hover);
}

.delete-btn {
  color: var(--warning);
}

.table-row.selected {
  background-color: var(--bg-hover);
  border-left: 3px solid var(--accent-primary);
}
</style>
