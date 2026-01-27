// Airtable Video Uploader - Simplified Version

let selectedFiles = [];
let apiKey = '';
let currentBase = '';
let currentTable = '';

// DOM elements
const apiKeyInput = document.getElementById('apiKey');
const saveApiBtn = document.getElementById('saveApiBtn');
const airtableUrl = document.getElementById('airtableUrl');
const parseUrlBtn = document.getElementById('parseUrlBtn');
const baseIdInput = document.getElementById('baseIdInput');
const tableIdInput = document.getElementById('tableIdInput');
const setTableBtn = document.getElementById('setTableBtn');
const uploadSection = document.getElementById('uploadSection');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const fileList = document.getElementById('fileList');
const uploadBtn = document.getElementById('uploadBtn');
const clearBtn = document.getElementById('clearBtn');
const statusDiv = document.getElementById('status');
const progressDiv = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');

// Load saved settings
chrome.storage.local.get(['airtableApiKey', 'airtableBase', 'airtableTable'], (result) => {
  if (result.airtableApiKey) {
    apiKey = result.airtableApiKey;
    apiKeyInput.value = apiKey;
  }

  if (result.airtableBase) {
    currentBase = result.airtableBase;
    baseIdInput.value = currentBase;
  }

  if (result.airtableTable) {
    currentTable = result.airtableTable;
    tableIdInput.value = currentTable;
  }

  // If everything is loaded, auto-show upload section
  if (apiKey && currentBase && currentTable) {
    uploadSection.style.display = 'block';
    showStatus(`✓ Settings loaded! Base: ${currentBase}, Table: ${currentTable}`, 'success');
  }
});

// Save API key
saveApiBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  apiKey = key;
  chrome.storage.local.set({ airtableApiKey: key }, () => {
    showStatus('✓ API Key saved!', 'success');
    setTimeout(() => statusDiv.style.display = 'none', 2000);
  });
});

// Parse Airtable URL
parseUrlBtn.addEventListener('click', () => {
  const url = airtableUrl.value.trim();

  if (!url) {
    showStatus('Please paste an Airtable URL', 'error');
    return;
  }

  // Extract Base ID (appXXXXXXXXXXXXXX)
  const baseMatch = url.match(/\/(app[a-zA-Z0-9]+)/);
  if (!baseMatch) {
    showStatus('Could not find Base ID in URL', 'error');
    return;
  }

  const baseId = baseMatch[1];

  // Auto-fill the base ID field
  baseIdInput.value = baseId;
  currentBase = baseId;

  // Save it
  chrome.storage.local.set({ airtableBase: baseId });

  showStatus(`✓ Base ID saved: ${baseId}. Now enter Table ID below.`, 'success');
});

// Set table
setTableBtn.addEventListener('click', () => {
  const baseId = baseIdInput.value.trim();
  const tableId = tableIdInput.value.trim();

  if (!apiKey) {
    showStatus('Please save your API key first', 'error');
    return;
  }

  if (!baseId) {
    showStatus('Please enter Base ID', 'error');
    return;
  }

  if (!tableId) {
    showStatus('Please enter Table ID', 'error');
    return;
  }

  currentBase = baseId;
  currentTable = tableId;

  // Save to Chrome storage so it auto-loads next time
  chrome.storage.local.set({
    airtableBase: baseId,
    airtableTable: tableId
  }, () => {
    uploadSection.style.display = 'block';
    showStatus(`✓ Saved & Ready! Base: ${baseId}, Table: ${tableId}`, 'success');
  });
});

// File selection - select individual files from anywhere
fileInput.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);

  // Filter for videos and images only
  const validFiles = newFiles.filter(file => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  });

  if (validFiles.length === 0) {
    showStatus('No valid video/image files found', 'error');
    return;
  }

  // ADD to existing selection
  selectedFiles = [...selectedFiles, ...validFiles];

  // Remove duplicates by full path
  const uniqueFiles = [];
  const seen = new Set();
  for (const file of selectedFiles) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  }
  selectedFiles = uniqueFiles;

  // Limit to 100 files
  if (selectedFiles.length > 100) {
    selectedFiles = selectedFiles.slice(0, 100);
    showStatus('⚠️ Limited to 100 files total', 'info');
  } else {
    showStatus(`✓ Added ${validFiles.length} files (${selectedFiles.length} total)`, 'success');
  }

  displayFileList();
  uploadBtn.disabled = selectedFiles.length === 0;
  clearBtn.style.display = selectedFiles.length > 0 ? 'block' : 'none';

  // Reset input so you can select more
  fileInput.value = '';
});

// Folder selection - select entire folder contents
folderInput.addEventListener('change', (e) => {
  const newFiles = Array.from(e.target.files);

  // Filter for videos and images only
  const validFiles = newFiles.filter(file => {
    return file.type.startsWith('video/') || file.type.startsWith('image/');
  });

  if (validFiles.length === 0) {
    showStatus('No valid video/image files found in folder', 'error');
    return;
  }

  // ADD to existing selection
  selectedFiles = [...selectedFiles, ...validFiles];

  // Remove duplicates by full path
  const uniqueFiles = [];
  const seen = new Set();
  for (const file of selectedFiles) {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueFiles.push(file);
    }
  }
  selectedFiles = uniqueFiles;

  // Limit to 100 files
  if (selectedFiles.length > 100) {
    selectedFiles = selectedFiles.slice(0, 100);
    showStatus('⚠️ Limited to 100 files total', 'info');
  } else {
    // Count unique folders
    const folders = new Set();
    for (const file of selectedFiles) {
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop();
          folders.add(parts.join('/'));
        }
      }
    }
    const folderCount = folders.size;
    if (folderCount > 1) {
      showStatus(`✓ Selected ${folderCount} folders (${selectedFiles.length} files)`, 'success');
    } else {
      showStatus(`✓ Selected ${selectedFiles.length} files`, 'success');
    }
  }

  displayFileList();
  uploadBtn.disabled = selectedFiles.length === 0;
  clearBtn.style.display = selectedFiles.length > 0 ? 'block' : 'none';

  // Reset input so you can select more folders
  folderInput.value = '';
});

// Clear all files
clearBtn.addEventListener('click', () => {
  selectedFiles = [];
  fileInput.value = '';
  folderInput.value = '';
  displayFileList();
  uploadBtn.disabled = true;
  clearBtn.style.display = 'none';
  showStatus('✓ Selection cleared', 'success');
  setTimeout(() => statusDiv.style.display = 'none', 2000);
});

function displayFileList() {
  if (selectedFiles.length === 0) {
    fileList.innerHTML = '<div style="color: #9ca3af; font-size: 12px;">No files selected</div>';
    return;
  }

  // Group files by folder
  const filesByFolder = new Map();
  for (const file of selectedFiles) {
    let folderPath = 'Individual files';
    if (file.webkitRelativePath) {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length > 1) {
        parts.pop();
        folderPath = parts[parts.length - 1]; // Show just the folder name, not full path
      }
    }
    if (!filesByFolder.has(folderPath)) {
      filesByFolder.set(folderPath, []);
    }
    filesByFolder.get(folderPath).push(file);
  }

  const folderCount = filesByFolder.size;
  const header = folderCount > 1
    ? `${folderCount} folders (${selectedFiles.length} files total)`
    : `${selectedFiles.length} file(s) selected`;

  let html = `<div style="margin-bottom: 6px; font-weight: 600;">${header}:</div>`;

  // Show files grouped by folder
  for (const [folderName, files] of filesByFolder) {
    if (filesByFolder.size > 1) {
      html += `<div style="color: #18bfff; font-size: 11px; margin-top: 8px; font-weight: 600;">📁 ${folderName} (${files.length} files)</div>`;
    }
    html += files.slice(0, 3).map(file => `
      <div class="file-item">${file.name}</div>
    `).join('');
    if (files.length > 3) {
      html += `<div class="file-item" style="color: #9ca3af;">... and ${files.length - 3} more from this folder</div>`;
    }
  }

  fileList.innerHTML = html;
}

// Upload process
uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) {
    showStatus('Please select files first', 'error');
    return;
  }

  if (!apiKey || !currentBase || !currentTable) {
    showStatus('Please set table info first', 'error');
    return;
  }

  uploadBtn.disabled = true;
  showStatus('Starting upload...', 'info');
  progressDiv.classList.add('active');

  console.log('=== STARTING UPLOAD ===');
  console.log('Files to upload:', selectedFiles.length);
  console.log('Base:', currentBase);
  console.log('Table:', currentTable);

  try {
    // Step 1: Group files by their parent folder
    const filesByFolder = new Map();

    for (const file of selectedFiles) {
      // Get the parent folder from webkitRelativePath (for folder selection) or use 'root' for file selection
      let folderPath = 'root';

      if (file.webkitRelativePath) {
        // Extract parent folder path (everything except the filename)
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop(); // Remove filename
          folderPath = parts.join('/'); // Get parent folder path
        }
      }

      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, []);
      }
      filesByFolder.get(folderPath).push(file);
    }

    console.log(`\n📁 Found ${filesByFolder.size} folder(s) to create records for:`);
    for (const [folder, files] of filesByFolder) {
      console.log(`  - ${folder}: ${files.length} files`);
    }

    // Step 2: Upload all files and group by folder
    const uploadedByFolder = new Map();
    const errors = [];
    let uploadedCount = 0;

    for (const [folderPath, files] of filesByFolder) {
      uploadedByFolder.set(folderPath, []);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadedCount++;
        console.log(`\n--- Uploading file ${uploadedCount}/${selectedFiles.length}: ${file.name} ---`);
        updateProgress(uploadedCount, selectedFiles.length, `Uploading ${file.name}...`);

        try {
          const fileUrl = await uploadToTempHost(file);

          if (!fileUrl) {
            console.error(`❌ Failed to get URL for ${file.name}`);
            errors.push(`${file.name}: Failed to upload to hosting`);
            continue;
          }

          console.log('✓ URL:', fileUrl);
          uploadedByFolder.get(folderPath).push({
            url: fileUrl,
            filename: file.name
          });

        } catch (error) {
          console.error(`❌ Error uploading ${file.name}:`, error);
          errors.push(`${file.name}: ${error.message}`);
        }

        // Small delay to avoid rate limiting
        await sleep(300);
      }
    }

    // Step 3: Create ONE record per folder
    let recordsCreated = 0;

    for (const [folderPath, uploadedFiles] of uploadedByFolder) {
      if (uploadedFiles.length > 0) {
        console.log(`\n--- Creating Airtable record for folder: ${folderPath} (${uploadedFiles.length} files) ---`);
        updateProgress(selectedFiles.length, selectedFiles.length, `Creating record for ${folderPath}...`);

        try {
          const result = await createAirtableRecord(uploadedFiles);
          console.log(`✓ Airtable record created: ${result.id}`);
          recordsCreated++;
        } catch (error) {
          console.error(`❌ Error creating record for ${folderPath}:`, error);
          errors.push(`Folder ${folderPath}: ${error.message}`);
        }

        // Small delay between record creation
        await sleep(300);
      }
    }

    console.log('\n=== UPLOAD COMPLETE ===');
    console.log('Records created:', recordsCreated);
    console.log('Files uploaded:', uploadedCount - errors.length);
    console.log('Files failed:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }

    if (recordsCreated === 0) {
      showStatus('❌ All uploads failed. Check console for details.', 'error');
    } else if (errors.length > 0) {
      showStatus(`⚠️ Done! ${recordsCreated} records created, ${errors.length} files failed.`, 'error');
    } else {
      showStatus(`✓ Done! ${recordsCreated} records created with ${uploadedCount} files!`, 'success');
    }

    // Clear file selection
    selectedFiles = [];
    fileInput.value = '';
    folderInput.value = '';
    displayFileList();
    clearBtn.style.display = 'none';

  } catch (error) {
    console.error('❌ Upload error:', error);
    showStatus(`Error: ${error.message}`, 'error');
  } finally {
    uploadBtn.disabled = false;
    setTimeout(() => {
      progressDiv.classList.remove('active');
    }, 5000);
  }
});

// Upload file to temporary hosting (direct approach with host_permissions)
async function uploadToTempHost(file) {
  console.log('Starting upload, size:', file.size, 'bytes');

  // Try catbox.moe first (most reliable)
  try {
    console.log('Trying catbox.moe...');
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('fileToUpload', file);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });

    console.log('catbox.moe response status:', response.status);

    if (response.ok) {
      const url = await response.text();
      console.log('✓ catbox.moe URL:', url.trim());
      if (url && url.startsWith('https://')) {
        return url.trim();
      }
    }
  } catch (error) {
    console.error('catbox.moe error:', error);
  }

  // Try uguu.se as second option
  try {
    console.log('Trying uguu.se...');
    const formData = new FormData();
    formData.append('files[]', file);

    const response = await fetch('https://uguu.se/upload', {
      method: 'POST',
      body: formData
    });

    console.log('uguu.se response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('uguu.se response:', data);

      if (data.success && data.files && data.files[0] && data.files[0].url) {
        const url = data.files[0].url;
        console.log('✓ uguu.se URL:', url);
        return url;
      }
    }
  } catch (error) {
    console.error('uguu.se error:', error);
  }

  // Try 0x0.st as final fallback
  try {
    console.log('Trying 0x0.st...');
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://0x0.st', {
      method: 'POST',
      body: formData
    });

    console.log('0x0.st response status:', response.status);

    if (response.ok) {
      const url = await response.text();
      console.log('✓ 0x0.st URL:', url.trim());
      if (url && url.startsWith('https://')) {
        return url.trim();
      }
    }
  } catch (error) {
    console.error('0x0.st error:', error);
  }

  throw new Error('Failed to upload file to any hosting service');
}

// Create new Airtable record with ALL attachments in one record
async function createAirtableRecord(filesArray) {
  const url = `https://api.airtable.com/v0/${currentBase}/${encodeURIComponent(currentTable)}`;

  const payload = {
    fields: {
      "Money Video": filesArray,  // Array of {url, filename} objects
      "Status": "Todo"
    }
  };

  console.log('Creating Airtable record...');
  console.log('URL:', url);
  console.log(`Attaching ${filesArray.length} files to one record`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  console.log('Airtable response status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Airtable error:', errorData);
    throw new Error(`Airtable error: ${errorData.error?.message || response.statusText}`);
  }

  const result = await response.json();
  console.log('✓ Airtable record created:', result.id);
  return result;
}

// Helper functions
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
}

function updateProgress(current, total, message) {
  const percent = (current / total) * 100;
  progressFill.style.width = `${percent}%`;
  progressText.textContent = `${current} / ${total} - ${message}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
