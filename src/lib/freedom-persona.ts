export type PersonaOverlayStatus = 'pending' | 'approved' | 'denied' | 'retired';
export type PersonaOverlaySource = 'freedom' | 'operator';
export type PersonaOverlayChangeType = 'new' | 'revision' | 'retirement';

export interface FreedomPersonaOverlay {
  id: string;
  title: string;
  instruction: string;
  rationale: string;
  source: PersonaOverlaySource;
  status: PersonaOverlayStatus;
  changeType: PersonaOverlayChangeType;
  targetOverlayId: string | null;
  createdAt: number;
  updatedAt: number;
}

export type FreedomPersonaUpdate =
  | { type: 'recorded'; overlay: FreedomPersonaOverlay }
  | { type: 'status'; overlayId: string; status: PersonaOverlayStatus }
  | { type: 'instruction'; overlayId: string; instruction: string };

function withPersonaOverlayUpdates(
  overlay: FreedomPersonaOverlay,
  updates: Partial<FreedomPersonaOverlay>,
): FreedomPersonaOverlay {
  return {
    ...overlay,
    ...updates,
  };
}

function sortByUpdatedAt<T extends { updatedAt: number }>(items: T[]) {
  return [...items].sort((left, right) => right.updatedAt - left.updatedAt);
}

export function isActivePersonaOverlay(overlay: FreedomPersonaOverlay) {
  return overlay.status === 'approved' && overlay.changeType !== 'retirement';
}

export function applyFreedomPersonaUpdate(
  overlays: FreedomPersonaOverlay[],
  update: FreedomPersonaUpdate,
): FreedomPersonaOverlay[] {
  if (update.type === 'recorded') {
    const remaining = overlays.filter((overlay) => overlay.id !== update.overlay.id);
    return sortByUpdatedAt([update.overlay, ...remaining]);
  }

  const now = Date.now();
  const requestedOverlay = overlays.find((overlay) => overlay.id === update.overlayId);
  const nextOverlays = overlays.map((overlay) => {
    if (
      update.type === 'status'
      && update.status === 'approved'
      && requestedOverlay?.targetOverlayId
      && requestedOverlay.changeType !== 'new'
      && overlay.id === requestedOverlay.targetOverlayId
    ) {
      return withPersonaOverlayUpdates(overlay, {
        status: 'retired',
        updatedAt: now,
      });
    }

    if (overlay.id !== update.overlayId) {
      return overlay;
    }

    if (update.type === 'status') {
      return withPersonaOverlayUpdates(overlay, {
        status: update.status,
        updatedAt: now,
      });
    }

    return withPersonaOverlayUpdates(overlay, {
      instruction: update.instruction,
      updatedAt: now,
    });
  });

  return sortByUpdatedAt(nextOverlays);
}
