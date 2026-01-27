# Airtable Video Uploader - Chrome Extension

Bulk upload videos and images to Airtable. Select up to 100 files or entire folders and automatically create new Airtable records.

## Features

- 🎬 Upload videos and images to Airtable
- 📁 Select individual files OR entire folders
- 🚀 Bulk upload up to 100 files at once
- 💾 Auto-saves your settings (API key, Base ID, Table ID)
- 📊 Real-time progress tracking
- ⚡ Creates 1 new record per file automatically

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

### Upload Individual Files

1. Click "📁 Select Files"
2. Choose videos/images (can select multiple)
3. Click "Upload Files & Create Records"

### Upload Entire Folder

1. Click "📂 Select Folder"
2. Choose a folder containing videos/images
3. Click "Upload Files & Create Records"

**The extension:**
- Filters to only videos & images
- Limits to 100 files max
- Creates 1 new Airtable record per file
- Sets the "Money Video" field to the uploaded file
- Sets the "Status" field to "Todo"

## Troubleshooting

### Check Console for Errors

**If uploads are failing:**
1. Right-click the extension popup → Inspect
2. Go to Console tab
3. Click "Upload Files & Create Records"
4. Look for detailed error messages in console

Common errors:
- `❌ Failed to upload to file.io` - Temporary file host is down
- `❌ Airtable error: ...` - Check your API key, Base ID, Table ID
- File type not supported - Only videos and images are accepted

### Folder Selection Not Working

Make sure you're using Chrome (not Firefox/Safari). The folder selection uses `webkitdirectory` which works in Chrome/Edge.

### Files Upload But Don't Appear in Airtable

Check console logs. Likely issues:
- file.io might be down (temporary file host)
- Airtable API rate limiting
- Wrong Table ID or field names

## Technical Details

### How It Works

1. **File Selection**: You select videos/images
2. **Upload to file.io**: Files are uploaded to temporary hosting (expires in 1 day)
3. **Create Airtable Record**: Extension creates a new record with:
   - "Money Video" field: Contains the uploaded file
   - "Status" field: Set to "Todo"
4. **Airtable Downloads**: Airtable automatically downloads the file from file.io and stores it permanently

### File Hosts

Currently uses **file.io** for temporary hosting:
- Free, no account needed
- Files expire after 1 day
- Airtable downloads them before expiration
- 2GB file size limit

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

Edit `popup.js` lines 320-329:

```javascript
const payload = {
  fields: {
    "Your Field Name": [  // Change this
      {
        url: fileUrl,
        filename: fileName
      }
    ],
    "Your Status Field": "Your Value"  // Change this
  }
};
```

### Change File Types

Edit `popup.js` lines 131-133 and 155-157:

```javascript
selectedFiles = selectedFiles.filter(file => {
  return file.type.startsWith('video/') || file.type.startsWith('image/');
  // Add more types: || file.type.startsWith('audio/')
});
```

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
