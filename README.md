# Airtable Video Uploader - Chrome Extension

Bulk upload videos and images to Airtable with smart folder grouping. Automatically creates 1 record per subfolder.

## Features

- 🎬 Upload videos and images to Airtable
- 📁 Select individual files OR entire folders
- 📂 **Smart subfolder grouping**: 1 record per subfolder automatically
- 🚀 Bulk upload up to 100 files at once
- 💾 Auto-saves your settings (API key, Base ID, Table ID)
- 📊 Real-time progress tracking with folder counts
- ⚡ Mix and match files and folders freely
- 🔔 **Background uploads**: Close popup and switch tabs - uploads continue!
- 📬 Desktop notifications when upload completes

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the `airtable-video-uploader` folder
6. Extension installed!

## Setup

### 1. Get Your Airtable API Key

1. Go to https://airtable.com/create/tokens
2. Click "Create new token"
3. Add scopes:
   - `data.records:read`
   - `data.records:write`
4. Add access to your bases
5. Copy the token (starts with `pat...`)

### 2. Get Your Base ID & Table ID

**Base ID:**
- Open your Airtable base
- Look at the URL: `https://airtable.com/appXXXXXXXX/...`
- The part starting with `app` is your Base ID

**Table ID:**
- Go to https://airtable.com/developers/web/api/introduction
- Select your base
- Find your table in the documentation
- The Table ID starts with `tbl` (e.g., `tbl35a79KbxFHWltu`)

### 3. Configure the Extension

1. Click the extension icon
2. Paste your API key and click "Save API Key"
3. Either:
   - Paste your Airtable URL and click "Get Base ID from URL"
   - OR manually enter Base ID
4. Enter your Table ID (from API docs)
5. Click "Set Table & Start Upload"

**Settings are auto-saved!** Next time you open the extension, everything loads automatically.

## Usage

### How It Works

The extension uses **smart grouping** based on selection method:
- **Folder selection**: Groups by subfolder → **1 record per subfolder**
- **File selection**: Each file separate → **1 record per file**

Examples:
- Master folder with 2 subfolders → **2 records created**
- Select 3 individual files → **3 records created**
- Each subfolder's files become attachments in that record

### Option 1: Upload Individual Files

1. Click "📁 Select Files"
2. Use Cmd/Ctrl+Click to select multiple files from anywhere
3. Click "Upload All Files & Create Record"
4. **Result**: Each file creates its own record

**Example**: Select `image1.png`, `image2.png`, `video.mp4`
- Record 1: image1.png
- Record 2: image2.png
- Record 3: video.mp4

### Option 2: Upload Folders (Smart Grouping)

1. Click "📂 Select Folder"
2. Choose a folder (can contain subfolders)
3. Click "Upload All Files & Create Record"

**Example:**
```
master-folder/
  post1/ (image1.png, image2.png)
  post2/ (video1.mp4, video2.mp4)
```
**Result**:
- Record 1: "post1" folder → 2 image attachments
- Record 2: "post2" folder → 2 video attachments

### Mix & Match

You can click "Select Files" and "Select Folder" multiple times before uploading - files accumulate until you click upload!

**Note**: When you mix file and folder selections, the system will:
- Create 1 record per individually selected file
- Create 1 record per subfolder from folder selections

### Background Uploads (New!)

**You can close the popup during upload!** The extension uses a background worker:
1. Click "Upload All Files & Create Record"
2. Files are prepared and sent to background worker
3. **Close the popup if you want** - upload continues in background
4. Switch tabs, browse other sites, do whatever
5. Get a **desktop notification** when upload completes

This is perfect for large batches - no need to keep the popup open!

**The extension:**
- Filters to only videos & images
- Limits to 100 files max
- Groups by subfolder automatically
- Sets the "Money Video" field to the uploaded files
- Sets the "Status" field to "Todo"
- Runs in background - close popup anytime!

## Troubleshooting

### Check Console for Errors

**If uploads are failing:**
1. Right-click the extension popup → Inspect
2. Go to Console tab
3. Click "Upload Files & Create Records"
4. Look for detailed error messages in console

Common errors:
- `❌ Failed to upload file to any hosting service` - All file hosts are down (rare)
- `❌ Airtable error: ...` - Check your API key, Base ID, Table ID
- File type not supported - Only videos and images are accepted

### Folder Grouping Not Working

The extension uses `webkitRelativePath` to detect subfolders. Make sure:
- You're using Chrome or Edge (not Firefox/Safari)
- You're selecting a folder (not individual files) for grouping to work
- The folder contains subfolders - flat folders create 1 record

### Files Upload But Don't Appear in Airtable

Check console logs (F12). Likely issues:
- Airtable API rate limiting (wait a few seconds and try again)
- Wrong Table ID or field names
- Network connectivity issues

## Technical Details

### How It Works

1. **File Selection**: You select videos/images (individual files or folders)
2. **Smart Grouping**: Extension detects subfolders and groups files by parent folder
3. **Upload to Temporary Host**: Files are uploaded to temporary hosting
4. **Create Airtable Records**: Extension creates records:
   - 1 record per subfolder (or 1 record for all individual files)
   - "Money Video" field: Contains all files from that folder as attachments
   - "Status" field: Set to "Todo"
5. **Airtable Downloads**: Airtable automatically downloads files and stores them permanently

### File Hosts (with Auto-Fallback)

Uses multiple hosts with automatic fallback:
1. **catbox.moe** (primary) - Most reliable, permanent hosting
2. **uguu.se** (backup) - 48-hour expiration
3. **0x0.st** (fallback) - Simple file host

All are free with no account needed. Airtable downloads files before expiration.

### Airtable Fields

The extension creates records with these fields:
- **Money Video** (Attachment field): The video/image file
- **Status** (Single select): Set to "Todo"

If your table has different field names, modify `popup.js` line 320-329.

### Rate Limiting

- Small 500ms delay between uploads to avoid rate limits
- Airtable API limit: 5 requests/second
- Recommended: Upload in batches of 50 files

## Customization

### Change Field Names

Find the `createAirtableRecord` function in `popup.js` and modify:

```javascript
const payload = {
  fields: {
    "Money Video": filesArray,  // Change to your attachment field name
    "Status": "Todo"            // Change to your field name and value
  }
};
```

### Change File Types

Find the file filtering code in `popup.js` and modify:

```javascript
const validFiles = newFiles.filter(file => {
  return file.type.startsWith('video/') || file.type.startsWith('image/');
  // Add more types: || file.type.startsWith('audio/')
});
```

### Change Grouping Behavior

To upload ALL files into 1 record (no subfolder grouping), find the upload button handler in `popup.js` and change Step 1 to not group by folder. See code comments for details.

## Privacy

- ✅ API key stored locally in Chrome
- ✅ All processing in your browser
- ✅ Files uploaded through file.io (temporary, expires in 1 day)
- ✅ No tracking or analytics
- ✅ Open source

## License

MIT - Do whatever you want with it!

## Support

For issues, check the console logs (right-click extension → Inspect → Console) for detailed error messages.

---

**Not affiliated with Airtable.** Independent tool using the Airtable API.
