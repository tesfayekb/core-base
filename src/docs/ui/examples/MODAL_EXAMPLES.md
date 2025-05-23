
# Modal and Dialog Implementation Examples

> **Version**: 1.0.0  
> **Last Updated**: 2025-05-23

## Overview

This document provides implementation examples for modals, dialogs, and confirmation components.

## Confirmation Dialog

```typescript
// Reusable confirmation dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {isLoading ? "Processing..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Usage example
function UserActions({ user }: { user: User }) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const handleDeleteUser = async () => {
    await fetch(`/api/users/${user.id}`, { method: 'DELETE' });
    // Refresh user list or update state
  };
  
  return (
    <>
      <Button 
        variant="destructive" 
        size="sm"
        onClick={() => setShowDeleteDialog(true)}
      >
        Delete User
      </Button>
      
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete User"
        description={`Are you sure you want to delete ${user.name}? This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteUser}
      />
    </>
  );
}
```

## Related Documentation

- **[FORM_EXAMPLES.md](FORM_EXAMPLES.md)**: Form implementation examples
- **[TABLE_EXAMPLES.md](TABLE_EXAMPLES.md)**: Data table implementation examples
- **[LOADING_EXAMPLES.md](LOADING_EXAMPLES.md)**: Loading states and skeleton examples

## Version History

- **1.0.0**: Extracted modal examples from main implementation examples document (2025-05-23)
