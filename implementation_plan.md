# Improving Merge Modal UX

## Goal Description
Enhance the table merging experience by centering the confirmation modal over the tables, preventing map interaction (zoom/pan) while the modal is open, and adding a backdrop dimming effect.

## User Review Required
> [!NOTE]
> The modal will now appear directly on top of the tables being merged, blocking the view of the tables themselves slightly. This is per the user request "la modale di conferma di unione tavoli deve sovrapporsi ai due tavoli".

## Proposed Changes

### Components

#### [MODIFY] [FloorManager.tsx](file:///Users/francescomaggi/Desktop/Progetti/hellotable/src/components/FloorManager.tsx)
-   **Update `onWheel`**: Add a check for `pendingMerge` to return early and prevent zooming/panning.
-   **Update Background `drag`**: Add `!pendingMerge` to the `drag` condition of the map container `motion.div`.
-   **Update `mergeModalPosition`**:
    -   Calculate the true center of the two merging tables.
    -   Remove the "-60" offset to place it directly over.
-   **Add Overlay**:
    -   Insert a `<motion.div>` overlay with `bg-black/50` (or similar opacity) and `z-[90]` when `pendingMerge` is true.
    -   Position it strictly absolute covering the entire canvas container.

## Verification Plan

### Manual Verification
1.  **Start the app** (`npm run dev`).
2.  **Drag one table onto another** to trigger the merge confirmation.
3.  **Verify Visuals**:
    -   The background should darken (opacity drop).
    -   The merge modal should appear centering the two tables (overlapping them).
4.  **Verify Interaction**:
    -   Try to scroll (wheel) -> Should be blocked.
    -   Try to drag the background -> Should be blocked.
    -   Try to drag other tables -> Should be blocked (by overlay).
5.  **Confirm/Cancel**:
    -   Click X -> Everything should return to normal (undimmed, interactive).
    -   Click Check -> Tables merge, everything returns to normal.
