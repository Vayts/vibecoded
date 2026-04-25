import type { ReactNode } from 'react';
import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { useFamilyMembersAccess } from '../../hooks/useFamilyMembersAccess';
import { FamilyMembersLockedState } from '../FamilyMembersLockedState';

interface FamilyMembersAccessGateProps {
  children: ReactNode;
}

export function FamilyMembersAccessGate({ children }: FamilyMembersAccessGateProps) {
  const familyMembersAccess = useFamilyMembersAccess();

  if (familyMembersAccess.isLoading) {
    return <ScreenSpinner />;
  }

  if (!familyMembersAccess.hasAccess) {
    return <FamilyMembersLockedState showBackAction />;
  }

  return <>{children}</>;
}

