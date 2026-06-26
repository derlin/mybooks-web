import { computed, type Ref, ref, watch } from 'vue';
import type { BooksProvider } from '../services/booksProvider';
import type { Book } from '../types';
import { normalizeTitle } from '../utils/books';
import type { FilterState } from '../utils/filtering';
import { DEFAULT_AUDIOBOOK_FILTER, DEFAULT_DNF_FILTER, DEFAULT_SEARCH_FIELD, filterAndSort } from '../utils/filtering';
import { deleteTagFromBooks, renameTagInBooks, tagExists, validateTag } from '../utils/tags';
import { checkDuplicateTitle } from '../utils/validation';
import { useToast } from './useToast';

export function useBookManager(booksProvider: BooksProvider, onFilesChanged?: Ref<boolean>) {
  const toast = useToast();

  // Data state
  const books = ref<Book[]>([]);
  const loading = ref(true);
  const error = ref<string | null>(null);
  const filters = ref<FilterState>({
    query: '',
    dnf: DEFAULT_DNF_FILTER,
    audiobook: DEFAULT_AUDIOBOOK_FILTER,
    searchField: DEFAULT_SEARCH_FIELD,
    tags: [],
  });
  const currentSort = ref({ id: 'date', desc: true });
  const selectedBook = ref<Book | null>(null);
  const isEditFormOpen = ref(false);
  const pendingUndo = ref<Book | null>(null);
  const isSaving = ref(false);

  // Computed
  const filteredAndSortedBooks = computed(() => {
    return filterAndSort(books.value, {
      dnfFilter: filters.value.dnf,
      audiobookFilter: filters.value.audiobook,
      searchQuery: filters.value.query,
      searchField: filters.value.searchField,
      tags: filters.value.tags,
      sortBy: currentSort.value.id,
      sortDesc: currentSort.value.desc,
    });
  });

  // Methods

  const toggleSort = (columnId: string) => {
    if (currentSort.value.id === columnId) {
      currentSort.value.desc = !currentSort.value.desc;
    } else {
      currentSort.value = { id: columnId, desc: false };
    }
  };

  const setFormHash = (mode?: string | null, bookKey?: string) => {
    if (!mode) {
      window.location.hash = '';
    } else if (mode === 'new') {
      window.location.hash = 'new';
    } else if (mode === 'edit' && bookKey) {
      window.location.hash = bookKey;
    }
  };

  const restoreFormFromHash = () => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash === 'new') {
      openNewBook();
    } else if (hash) {
      const book = books.value.find((b) => b._key === hash);
      if (book) {
        openEditForm(book);
      } else {
        setFormHash();
      }
    }
  };

  const openEditForm = (book: Book) => {
    selectedBook.value = book;
    isEditFormOpen.value = true;
    setFormHash('edit', book._key);
  };

  const openNewBook = () => {
    selectedBook.value = null;
    isEditFormOpen.value = true;
    setFormHash('new');
  };

  const closeForm = () => {
    isEditFormOpen.value = false;
    selectedBook.value = null;
    error.value = null;
    setFormHash();
  };

  const loadBooksFromDropbox = async () => {
    books.value = await booksProvider.downloadBooks();
  };

  const checkRevisionBeforeOperation = async (operationName: string) => {
    try {
      const revisionChanged = await booksProvider.checkFileRevision();
      if (revisionChanged) {
        console.log(`[Books] ${operationName} aborted: file revision changed, reloading`);
        await loadBooksFromDropbox();
        error.value = 'Books were updated by another session. Please review changes and try again.';
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`[Books] Error checking revision before ${operationName}:`, err);
      error.value = 'Failed to verify book state. Please try again.';
      return false;
    }
  };

  const deleteBook = async (book: Book) => {
    if (!(await checkRevisionBeforeOperation('delete'))) {
      return;
    }

    const deletedBook = books.value.find((b) => b._key === book._key);
    if (!deletedBook) return;
    // Remove from local state
    books.value = books.value.filter((b) => b._key !== book._key);

    try {
      // Upload to Dropbox
      await booksProvider.uploadBooks(books.value);

      // Store for potential undo (only after successful upload)
      pendingUndo.value = deletedBook;

      // Show delete toast with undo action
      toast.showSuccess(
        'Book deleted',
        {
          label: 'Undo',
          callback: undoDelete,
        },
        5000
      );
    } catch (err: any) {
      // Restore local state on error
      books.value.push(deletedBook);
      error.value = err.message || 'Failed to delete book';
    }
  };

  const undoDelete = async () => {
    if (!pendingUndo.value) return;
    const bookToRestore = pendingUndo.value;

    try {
      // Restore book to array
      books.value.push(bookToRestore);

      // Upload to Dropbox
      await booksProvider.uploadBooks(books.value);

      // Clear undo state
      pendingUndo.value = null;
      toast.showSuccess('Book restored', undefined, 3000);
    } catch (err: any) {
      // Rollback on error - remove the book we just added
      books.value = books.value.filter((b) => b._key !== bookToRestore._key);
      error.value = err.message || 'Failed to restore book';
    }
  };

  const handleEditSave = async (editedBook: any) => {
    if (!(await checkRevisionBeforeOperation('save'))) {
      isSaving.value = false;
      return;
    }

    const editedBookKey = selectedBook.value?._key;
    const duplicateCheck = checkDuplicateTitle(editedBook.title, books.value, editedBookKey);
    if (duplicateCheck.isDuplicate) {
      error.value = duplicateCheck.error;
      isSaving.value = false;
      return;
    }

    isSaving.value = true;
    try {
      const newKey = editedBookKey ?? normalizeTitle(editedBook.title);

      const bookToSave: Book = {
        title: editedBook.title,
        author: editedBook.author,
        date: editedBook.date,
        dnf: editedBook.dnf,
        notes: editedBook.notes,
        tags: editedBook.tags?.length > 0 ? editedBook.tags : undefined,
        meta: editedBook.meta,
        _key: newKey,
      };

      // Build new books array
      let newBooks: Book[];
      if (editedBookKey) {
        if (editedBook === newKey) {
          // Edit without rename: replace in place
          newBooks = books.value.map((b) => (b._key === editedBookKey ? bookToSave : b));
        } else {
          // Rename: remove old key, add with new key
          newBooks = [...books.value.filter((b) => b._key !== editedBookKey), bookToSave];
        }
      } else {
        // New book: add to array
        newBooks = [...books.value, bookToSave];
      }

      // Upload to Dropbox
      await booksProvider.uploadBooks(newBooks);

      // Update local state only after successful upload
      books.value = newBooks;
      selectedBook.value = bookToSave;
      error.value = null;
      toast.showSuccess(editedBookKey ? 'Book saved successfully' : 'Book added successfully', undefined, 3000);
      closeForm();
    } catch (err: any) {
      error.value = err.message || 'Failed to save book';
    } finally {
      isSaving.value = false;
    }
  };

  const renameTagAcrossAllBooks = async (oldTag: string, newTag: string) => {
    const validation = validateTag(newTag);
    if (!validation.isValid) {
      toast.showError(validation.error);
      return;
    }

    if (tagExists(newTag, books.value) && newTag !== oldTag) {
      toast.showError('Tag already exists');
      return;
    }

    isSaving.value = true;
    try {
      const renamedBooks = renameTagInBooks(oldTag, newTag, books.value);
      await booksProvider.uploadBooks(renamedBooks);
      books.value = renamedBooks;
      toast.showSuccess(`Renamed "${oldTag}" to "${newTag}"`);
    } catch (err: any) {
      console.error('Failed renaming tag', err);
      error.value = 'Failed to rename tag';
      toast.showError(error.value);
    } finally {
      isSaving.value = false;
    }
  };

  const deleteTagFromAllBooks = async (tag: string) => {
    isSaving.value = true;
    try {
      const booksWithTag = books.value.filter((book) => book.tags?.includes(tag)).length;
      const deletedBooks = deleteTagFromBooks(tag, books.value);
      await booksProvider.uploadBooks(deletedBooks);
      books.value = deletedBooks;
      toast.showSuccess(`Deleted tag "${tag}" from ${booksWithTag} book${booksWithTag !== 1 ? 's' : ''}`);
    } catch (err: any) {
      console.error('Failed deleting tag', err);
      error.value = 'Failed to delete tag';
      toast.showError(error.value);
    } finally {
      isSaving.value = false;
    }
  };

  // Watcher for file changes
  watch(
    () => onFilesChanged?.value,
    async (changed) => {
      if (changed) {
        console.log('[Books] File revision changed, reloading from Dropbox');
        try {
          await loadBooksFromDropbox();
          console.log(`[Books] Reloaded ${books.value.length} books from Dropbox`);
          toast.showSuccess('Books updated from Dropbox', undefined, 3000);
        } catch (err: any) {
          error.value = err.message || 'Failed to refresh books';
          console.error('[Books] Error reloading from Dropbox:', err);
        }
      }
    }
  );

  // Initialization
  const init = async () => {
    try {
      await loadBooksFromDropbox();
      restoreFormFromHash();
    } catch (err: any) {
      console.error(err);
      error.value = err.message || 'Failed to load books';
    } finally {
      loading.value = false;
    }
  };

  return {
    // State
    books,
    loading,
    error,
    filters,
    currentSort,
    selectedBook,
    isEditFormOpen,
    isSaving,
    pendingUndo,

    // Computed
    filteredAndSortedBooks,

    // Methods
    toggleSort,
    openEditForm,
    openNewBook,
    closeForm,
    deleteBook,
    undoDelete,
    handleEditSave,
    renameTagAcrossAllBooks,
    deleteTagFromAllBooks,
    init,
  };
}
