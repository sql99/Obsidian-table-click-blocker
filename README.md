# Obsidian-table-click-blocker
Prevents cursor jumping when clicking on markdown tables in Live Preview

This plugin is designed for those who dislike Obsidian's default behavior with Markdown tables. Specifically, when you are in "Live Preview" and use the "Find" feature, if text is found inside a Markdown table, the table is rendered as if it were in "Source Mode." However, if you double-click the text inside the table (for example, for copying purposes), it automatically switches to "Reading Mode," causing an annoying "cursor jump."

# Obsidian's Original Behavior (Without the Plugin)
https://github.com/user-attachments/assets/f4f3380f-c226-4346-9f9b-37cb9ddecc67




# Obsidian's Behavior With the Table Click Blocker Plugin
https://github.com/user-attachments/assets/1c4b1659-1550-4689-bc90-ae0a8f62d71d


# installing Plugin:

## Via the Community Plugin Manager
- Open the Community Plugins tab of your Obsidian's settings modal.
- Click the "Browse" button under "Community Plugins".
- Search for "Table Click Blocker".
- Click "Install" on the plugin page, then "Enable".

## Via URI/Browser
- Visit the official plugin page on Obsidian's plugin repository.
- Click "Install".
- Allow the site to open the obsidian link via Obsidian.
- Click "Install" on the plugin page, then "Enable".
## Manually
- Download the latest release of the plugin.  
- Create a remove-newlines folder in your vault's plugins/ directory: /.obsidian/plugins/table-click-blocker
- Unzip the release file and copy over main.js and manifest.json into the table-click-blocker/ folder you created in step 2.

## Via Brat
- Install the latest version of BRAT and enable it.
- (Optional but highly recommended) In the BRAT settings, turn on Auto-update plugins at startup at the top of the page.
- Open the following URL in the browser: Obsidian://brat?plugin=sql99/Obsidian-table-click-blocker
- Click the "Add Plugin" button.
