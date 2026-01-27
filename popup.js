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

  // Detect if files are from folder selection or individual file selection
  const hasFolderStructure = selectedFiles.some(file => file.webkitRelativePath);

  if (hasFolderStructure) {
    // FOLDER SELECTION: Group by folder
    const filesByFolder = new Map();
    for (const file of selectedFiles) {
      let folderPath = 'root';
      if (file.webkitRelativePath) {
        const parts = file.webkitRelativePath.split('/');
        if (parts.length > 1) {
          parts.pop();
          folderPath = parts[parts.length - 1]; // Show just the folder name
        }
      }
      if (!filesByFolder.has(folderPath)) {
        filesByFolder.set(folderPath, []);
      }
      filesByFolder.get(folderPath).push(file);
    }

    const folderCount = filesByFolder.size;
    const header = `${folderCount} folder${folderCount > 1 ? 's' : ''} (${selectedFiles.length} files) → ${folderCount} records`;

    let html = `<div style="margin-bottom: 6px; font-weight: 600;">${header}:</div>`;

    // Show files grouped by folder
    for (const [folderName, files] of filesByFolder) {
      html += `<div style="color: #18bfff; font-size: 11px; margin-top: 8px; font-weight: 600;">📁 ${folderName} (${files.length} files)</div>`;
      html += files.slice(0, 3).map(file => `
        <div class="file-item">${file.name}</div>
      `).join('');
      if (files.length > 3) {
        html += `<div class="file-item" style="color: #9ca3af;">... and ${files.length - 3} more</div>`;
      }
    }

    fileList.innerHTML = html;
  } else {
    // FILE SELECTION: Show individual files (each becomes 1 record)
    const header = `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} → ${selectedFiles.length} records`;

    let html = `<div style="margin-bottom: 6px; font-weight: 600;">${header}:</div>`;
    html += selectedFiles.slice(0, 10).map(file => `
      <div class="file-item">📄 ${file.name}</div>
    `).join('');
    if (selectedFiles.length > 10) {
      html += `<div class="file-item" style="color: #9ca3af;">... and ${selectedFiles.length - 10} more files</div>`;
    }

    fileList.innerHTML = html;
  }
}

// Upload process - delegates to background worker so it continues even if popup closes
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
  showStatus('Preparing files for upload...', 'info');
  progressDiv.classList.add('active');

  console.log('=== PREPARING UPLOAD ===');
  console.log('Files to upload:', selectedFiles.length);
  console.log('Base:', currentBase);
  console.log('Table:', currentTable);

  try {
    // Convert files to data URLs so they can be sent to background worker
    updateProgress(0, selectedFiles.length, 'Converting files...');
    const filesData = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      updateProgress(i + 1, selectedFiles.length, `Preparing ${file.name}...`);

      const dataUrl = await fileToDataUrl(file);
      filesData.push({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        webkitRelativePath: file.webkitRelativePath || '',
        dataUrl: dataUrl
      });
    }

    console.log('✓ Files prepared, sending to background worker');
    showStatus('Upload started! You can close this popup - we\'ll notify you when done.', 'success');

    // Send to background worker - this will continue even if popup closes
    chrome.runtime.sendMessage({
      action: 'startUpload',
      data: {
        files: filesData,
        apiKey: apiKey,
        baseId: currentBase,
        tableId: currentTable
      }
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Message error:', chrome.runtime.lastError);
        showStatus('❌ Failed to start background upload', 'error');
        uploadBtn.disabled = false;
        return;
      }

      if (response && response.success) {
        console.log('✓ Background upload completed:', response.result);
      } else {
        console.error('Background upload failed:', response?.error);
      }
    });

    // Clear file selection and reset UI
    selectedFiles = [];
    fileInput.value = '';
    folderInput.value = '';
    displayFileList();
    clearBtn.style.display = 'none';
    uploadBtn.disabled = false;

    setTimeout(() => {
      progressDiv.classList.remove('active');
    }, 2000);

  } catch (error) {
    console.error('❌ Upload preparation error:', error);
    showStatus(`Error: ${error.message}`, 'error');
    uploadBtn.disabled = false;
    setTimeout(() => {
      progressDiv.classList.remove('active');
    }, 5000);
  }
});

// Helper: Convert File to data URL
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
