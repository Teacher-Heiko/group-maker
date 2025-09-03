# group-maker

# Student Grouping Tool

This tool helps teachers and educators create and manage student groups for classes.

## Features

*   **Load Class Lists**: Load student lists for different classes (e.g., 701, 702) from `.txt` files.
*   **Create Groups**: Automatically create random groups of a specified size.
*   **Shuffle Groups**: Re-shuffle students who are not locked in their groups.
*   **Lock Students**: Lock individual students to keep them in their current group during a shuffle.
*   **Drag and Drop**: Manually move students between groups.
*   **Save and Load History**: 
    *   Save group configurations with a timestamp.
    *   Automatically loads the history for a selected class.
    *   Load previous group configurations from a specific timestamp using a dropdown menu.
*   **Avoid Re-Grouping**: The shuffling algorithm minimizes re-grouping students who have been together in the past.
*   **Incompatible Pairs**: Mark pairs of students who should not be in the same group.
*   **Add Empty Groups**: Create new, empty groups on the fly.
*   **Responsive Layout**: Groups are displayed in a 2x5 grid for easy viewing.
*   **Node.js Backend**: A simple Node.js server handles file operations for loading and saving data.

## How to Run

1.  Install Node.js if you haven't already.
2.  Open a terminal in the project folder.
3.  Run `npm install` to install the necessary dependencies.
4.  Run `npm start` to start the server.
5.  Open your web browser and go to `http://localhost:3000`.
