
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface UserFormActionsProps {
  isSubmitting: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  submitError?: string;
}

export function UserFormActions({ isSubmitting, isEditMode, onCancel, submitError }: UserFormActionsProps) {
  return (
    <>
      {/* Submit Error */}
      {submitError && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
        </Button>
      </div>
    </>
  );
}
