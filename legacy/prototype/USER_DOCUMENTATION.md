# Terminology Server - User Documentation

## Overview

The Terminology Server is a component within the TRICC frontend application that allows users to search for and manage concepts and code systems within their clinical decision support projects.

## Features

### Concept List

- **Search Concepts**: Use the search bar to find concepts by display name or code
- **Filter by Code System**: Use the dropdown to filter concepts by specific code system or show all
- **Create New Concepts**: Click the "+" button beside the search button to open the concept creation dialog
- **Concept Properties**:
  - **Code**: Unique identifier for the concept (required)
  - **Display Name**: Human-readable name (required)
  - **System**: The code system this concept belongs to
  - **Data Type**: String, Integer, Decimal, Boolean, or Date
  - **Concept Type**: Custom, Standard, or Local

### Code System List

- **Search Code Systems**: Use the search bar to find code systems by name, ID, or description
- **Create New Code Systems**: Click the "+" button beside the search button to open the code system creation dialog
- **Code System Properties**:
  - **Name**: Display name for the code system (required)
  - **Description**: Optional description of the code system
- **View Code System Details**: Shows ID, description, and number of concepts

### Node Display Inheritance

- **Concept-Based Display**: Nodes automatically inherit their display text from associated concepts
- **Sequence Node Exception**: Start, end, activity start, and activity end nodes retain their custom labels
- **Mandatory for All Other Nodes**: All other node types must use concept display when a concept is assigned
- **Select Node Behavior**: Select nodes (select_one, select_multiple) can have both a main concept (for the question/prompt) and option concepts (for selectable values)

## How to Use

### Searching for Concepts

1. Navigate to the Terminology Server page
2. Enter search terms in the search field
3. Click Search or press Enter
4. Browse through the results
5. Click "Select" on concepts you want to use

### Creating New Concepts

1. Click the "+" button beside the Search button
2. Fill in the required fields (Code and Display Name)
3. Optionally set System, Data Type, and Concept Type
4. Click "Save" to create the concept
5. The concept will be added to the default code system

### Managing Servers

1. In the Server Configuration panel, click "Add Server"
2. Enter server details (Name, URL, Description)
3. Click "Add Server" to save
4. Use the link icon to set a server as default
5. Use the delete icon to remove servers

## User Interface Elements

- **Search Bar**: Main input field for search terms
- **Search Button**: Initiates the search
- **+ Button**: Opens concept creation dialog
- **Clear Button**: Resets search and results
- **Results List**: Displays search results with concept/code system details
- **Select Button**: For concepts, allows selection
- **View Button**: For code systems, shows details

## Tips

- Search terms are case-insensitive
- Both concept display names and codes are searchable
- New concepts are automatically added to the "FHIR Code System"
- The search includes both local project concepts and configured code systems