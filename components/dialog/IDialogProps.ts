import type { ReactNode } from 'react';

interface IDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
  title: string;
  children?: ReactNode;
}

export default IDialogProps;
