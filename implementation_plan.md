# Evening Service Simulation Update

## Goal
Enhance the "Evening Service" simulation to include:
1.  **Merged Tables**: Simulate tables that have been joined (e.g., for a large group) and are currently occupied.
2.  **Sequential Single Reservations**: For these merged tables, simulate a *future* reservation that applies to only *one* of the original tables (implying the group will leave and the tables will be separated).

## Proposed Changes

### [src/lib/DemoScenarios.ts](file:///Users/francescomaggi/Desktop/Progetti/hellotable/src/lib/DemoScenarios.ts)

Modify `getEveningScenario` to:

1.  **Define Merge Targets**: Select distinct pairs of tables to merge (e.g., `m9` + `m10`).
2.  **Create Merged Entity**:
    - Calculate center position.
    - Set `subTables` property.
    - Set capacity (sum of parts).
    - Status: `OCCUPIED`.
3.  **Add Reservations**:
    - **Current**: Large group (e.g., 8 pax) seated at 20:00.
    - **Future**: Small group (e.g., 2 pax) at 22:30, with a note "Solo Tavolo m9".
4.  **Cleanup**: Remove the original single tables from the returned array to avoid duplicates.

## Verification
1.  Login as "Demo Evening".
2.  Verify the presence of a large merged table.
3.  Check its details/reservations to see the "Current" large group and the "Future" small reservation with the note.
