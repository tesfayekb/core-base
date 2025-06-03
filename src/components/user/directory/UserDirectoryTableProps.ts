
import { UserWithRoles } from '@/types/user';

export interface UserDirectoryTableProps {
  users: UserWithRoles[];
  isLoading: boolean;
  selectedUsers: string[];
  onSelectAll: () => void;
  onSelectUser: (userId: string) => void;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  onSort: (field: string) => void;
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  totalUsers: number;
}
