# Terminology Server - Requirements & Architecture

## Requirements

### Functional Requirements

#### FR-001: Concept List Management
- **Description**: Users must be able to search and manage concepts in a dedicated list interface
- **Acceptance Criteria**:
  - Separate concept list section with independent search
  - Code system filter dropdown with "All Code Systems" option
  - Search by concept display name or code
  - "+" button for concept creation
  - Results show concept details and "Select" action

#### FR-002: Code System List Management
- **Description**: Users must be able to search and manage code systems in a dedicated list interface
- **Acceptance Criteria**:
  - Separate code system list section with independent search
  - Search by code system name, ID, or description
  - "+" button for code system creation
  - Results show code system details and concept count

#### FR-003: Concept Creation
- **Description**: Users must be able to create new concepts through a dialog interface
- **Acceptance Criteria**:
  - "+" button in concept list opens creation dialog
  - Required fields: Code and Display Name
  - Optional fields: System, Data Type, Concept Type
  - Save button adds concept to default code system
  - Cancel button closes dialog without saving
  - Form validation prevents saving incomplete concepts

#### FR-004: Code System Creation
- **Description**: Users must be able to create new code systems through a dialog interface
- **Acceptance Criteria**:
  - "+" button in code system list opens creation dialog
  - Required field: Name
  - Optional field: Description
  - Save button creates new code system
  - Cancel button closes dialog without saving

#### FR-005: Node Display Inheritance
- **Description**: Nodes must inherit display text from associated concepts
- **Acceptance Criteria**:
  - Non-sequence nodes use concept.display when concept is assigned
  - Sequence nodes (start, end, activity_start, activity_end) retain custom labels
  - Display inheritance is mandatory for all applicable node types
  - Select nodes can have both a main concept (for node display) and option concepts (for selectable values)

### Non-Functional Requirements

#### NFR-001: Performance
- Search operations should complete within 500ms for local data
- UI remains responsive during search operations
- Loading states displayed for long operations

#### NFR-002: Usability
- Intuitive interface following Material-UI design patterns
- Keyboard navigation support (Enter to search)
- Clear visual feedback for user actions
- Consistent terminology and labeling

#### NFR-003: Data Integrity
- Concept codes must be unique within code systems
- Required fields validated before saving
- Data persistence through localStorage

## Architecture

### Component Structure

```
TerminologyServer (Main Component)
├── Concept List Section
│   ├── Code System Filter Dropdown
│   ├── Concept Search Controls (+ button, search, clear)
│   ├── Concept Results List
│   └── Create Concept Dialog
├── Code System List Section
│   ├── Code System Search Controls (+ button, search, clear)
│   ├── Code System Results List
│   └── Create Code System Dialog
└── State Management
    ├── Concept List State
    │   ├── conceptSearchTerm, selectedCodeSystem, conceptResults, conceptLoading, conceptError
    ├── Code System List State
    │   ├── codeSystemSearchTerm, codeSystemResults, codeSystemLoading, codeSystemError
    └── Dialog States
        ├── createConceptDialogOpen, newConcept
        └── createCodeSystemDialogOpen, newCodeSystem
```

### Data Flow

1. **Concept Search Operation**:
   ```
   User Input → handleConceptSearch() → Filter Concepts by Search Term + Code System → Update conceptResults State → Render Concept Results
   ```

2. **Code System Search Operation**:
   ```
   User Input → handleCodeSystemSearch() → Filter Code Systems by Search Term → Update codeSystemResults State → Render Code System Results
   ```

3. **Concept Creation**:
   ```
   + Button Click (Concept List) → Open Dialog → Form Input → Save Click → Validate → Add to Code System → Close Dialog
   ```

4. **Code System Creation**:
   ```
   + Button Click (Code System List) → Open Dialog → Form Input → Save Click → Validate → Create Code System → Close Dialog
   ```

5. **Node Display Inheritance**:
   ```
   Node Render → Check nodeType → If not sequence node AND concept exists → Use concept.display → Else use data.label
   ```

### State Management

#### Local Component State
- **Concept List State**:
  - `conceptSearchTerm`: String - Current concept search input
  - `selectedCodeSystem`: String - Selected code system filter ("all" or specific ID)
  - `conceptResults`: Concept[] - Filtered concept search results
  - `conceptLoading`: Boolean - Concept search operation status
  - `conceptError`: String | null - Concept search error messages
- **Code System List State**:
  - `codeSystemSearchTerm`: String - Current code system search input
  - `codeSystemResults`: CodeSystem[] - Filtered code system search results
  - `codeSystemLoading`: Boolean - Code system search operation status
  - `codeSystemError`: String | null - Code system search error messages
- **Dialog States**:
  - `createConceptDialogOpen`: Boolean - Concept creation dialog visibility
  - `createCodeSystemDialogOpen`: Boolean - Code system creation dialog visibility
  - `newConcept`: Object - Form data for concept creation
  - `newCodeSystem`: Object - Form data for code system creation

#### External State (useProject Hook)
- `getAllConcepts()`: Returns all concepts from project code systems
- `getCodeSystems()`: Returns all code systems as Record<string, CodeSystem>
- `addConceptToCodeSystem(codeSystemId, concept)`: Adds concept to specified code system
- `createCodeSystem(codeSystemData)`: Creates new code system and returns ID

### Key Design Decisions

#### Unified Search Results
- **Decision**: Single results array with type discrimination instead of separate arrays
- **Rationale**: Simplifies rendering logic and maintains consistent ordering
- **Implementation**: `{type: 'concept' | 'codesystem', item: Concept | CodeSystem}[]`

#### Default Code System
- **Decision**: New concepts added to "FHIRcodesystem" by default
- **Rationale**: Ensures concepts are always associated with a code system
- **Implementation**: Hardcoded default ID with fallback handling

#### Dialog-Based Creation
- **Decision**: Modal dialog for concept creation instead of inline form
- **Rationale**: Keeps search interface clean and focused
- **Implementation**: Material-UI Dialog with form validation

### Dependencies

#### External Libraries
- **React**: Component framework
- **Material-UI**: UI component library
- **TypeScript**: Type safety

#### Internal Modules
- `../types`: TypeScript interfaces (Concept, CodeSystem, TerminologyServerConfig)
- `../hooks/useProject`: Project state management
- `../utils/triccSerializer`: Data serialization (future use)
- `../utils/triccValidator`: Data validation (future use)

### Error Handling

- **Search Errors**: Caught in try-catch, displayed as user alerts
- **Validation Errors**: Form validation prevents invalid saves
- **Data Errors**: Graceful fallbacks for missing data
- **Persistence Errors**: localStorage failures logged to console

### Future Enhancements

#### Planned Features
- Integration with external terminology servers
- Concept import/export functionality
- Advanced search filters
- Concept versioning
- Bulk operations

#### Technical Debt
- Search could be debounced for better performance
- Results pagination for large datasets
- Undo/redo functionality for concept operations