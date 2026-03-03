# sql-csv-tool
Simple VS Code editor meant for easily querying and editing csv files using SQL built on duckdb.


Why I am building this?
- the duckdb extension for VS Code doesn't let me edit the SQL and run it, so its missing out on all the capabilities in SQL
- that extension also lacks the ablity to support an MCP to simplify LLMs iterating over CSV files, I have too many cases in data modeling and mapping where it takes up too much context to operate on CSV files

Here is what I want:
- want a VS Code extension that i can click on delimited files in the explorer, and open them in a custom editor
- I want it to behave like a typical SQL IDE, with a:
    - query editor on top left (80% width default)
    - schema browser on top right
    - results pane on the bottom (default to 60% height)
    - panels should be resizable
- I want intellisense for the SQL editor too
- I want to be able to edit cells directly in the results pane and have those changes reflected in the underlying csv file
- I want to one-click filter of columns by right clicking on a cell and and having a context
- we might have to paginate the results pane beyond 1k rows
- It needs to support the color themes of VS Code at least support dark mode
- I want to be able to delete rows
- I would like a simple way to add a row too, can click to add a row then edit the cells in the results pane, perhaps clicking on a row number column on the left gutter of the preview pane

- I want to be able to "save" explicitly to save changes to the csv file.
- some delimited files don't have headers, I think duckdb does a good job of handling this.
- I would like this extension to include an MCP server which can be used by LLM's like Claude or CoPilot to:
    - edit the SQ for me
    - run sql and get result samples
    - query the metadata of the tables
    - use this to more easily manipulate CSV files
    - support alter table statements to add/remove columns

For the code itself:
- coding a webapp the way VS Code wants to package it by storing the content as a string is a pain, I prefer the webapp source to run and test as a standalone webapp ideally, and manage the bundling for VS Code as a separate step.
