# Fixing Table Timer at 00:00

## Goal Description
Ensure that the timer on occupied tables starts counting immediately upon "Occupy" or "Check-in". currently, it remains stuck at 00:00.

## Diagnosis
The `TableNode` component calculates duration based on satisfaction of `currentTime - data.seatedAt`.
If it stays at 00:00, it means either:
1. `currentTime` is not updating (unlikely, as we saw the interval).
2. `data.seatedAt` is essentially equal to `currentTime` and not static (unlikely).
3. `data.seatedAt` is NOT being set or saved in the state correctly.
4. The formatting logic returns 00:00 for small differences and doesn't update.

## PROPOSED CHANGES

### [FloorManager.tsx](file:///Users/francescomaggi/Desktop/Progetti/hellotable/src/components/FloorManager.tsx)

1.  **Check `updateTableStatus`**: Ensure `seatedAt` is set to `Date.now()`.
2.  **Check `startTimeOffsetRef` logic**: The `currentTime` state initialization might be causing issues if `initialTime` matches `Date.now()` too closely or resets.

### [TableNode.tsx](file:///Users/francescomaggi/Desktop/Progetti/hellotable/src/components/TableNode.tsx)

1.  **Debug Duration**: The calculation `Math.max(0, currentTime - data.seatedAt)` should yield positive results.
2.  **Verify Updates**: Ensure the component re-renders when `currentTime` changes.

## Verification Plan
1.  Open the app.
2.  Click "Occupa Tavolo".
3.  Watch the timer. It should increment: 00:01, 00:02...
