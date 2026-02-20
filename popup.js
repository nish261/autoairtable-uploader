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

// Check for pending upload on page load
chrome.storage.local.get(['pendingUpload'], (result) => {
  if (result.pendingUpload && result.pendingUpload.remaining.length > 0) {
    const pending = result.pendingUpload;
    showStatus(`⚠️ ${pending.remaining.length} folders pending from last session`, 'info');

    // Create resume button
    const resumeBtn = document.createElement('button');
    resumeBtn.textContent = `Resume Upload (${pending.completed}/${pending.total} done)`;
    resumeBtn.style.cssText = 'background:#f59e0b;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;margin-top:8px;width:100%;';
    resumeBtn.onclick = async () => {
      resumeBtn.remove();
      // User needs to re-select the same folder to get File objects
      showStatus('⚠️ Re-select the SAME folder to resume', 'info');
    };

    const clearPendingBtn = document.createElement('button');
    clearPendingBtn.textContent = 'Clear & Start Fresh';
    clearPendingBtn.style.cssText = 'background:#6b7280;color:white;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;margin-top:4px;width:100%;';
    clearPendingBtn.onclick = () => {
      chrome.storage.local.remove(['pendingUpload']);
      resumeBtn.remove();
      clearPendingBtn.remove();
      showStatus('✓ Cleared. Ready for new upload.', 'success');
    };

    statusDiv.after(clearPendingBtn);
    statusDiv.after(resumeBtn);
  }
});

// Upload process - 3 folders at a time, create records immediately
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
  progressDiv.classList.add('active');

  // Group files by folder
  const folderQueue = [];
  const filesByFolder = new Map();

  for (const file of selectedFiles) {
    let folderPath;
    if (file.webkitRelativePath) {
      const parts = file.webkitRelativePath.split('/');
      if (parts.length > 1) {
        parts.pop();
        folderPath = parts.join('/');
      } else {
        folderPath = 'root';
      }
    } else {
      folderPath = `file_${file.name}_${file.size}_${file.lastModified}`;
    }

    if (!filesByFolder.has(folderPath)) {
      filesByFolder.set(folderPath, []);
    }
    filesByFolder.get(folderPath).push(file);
  }

  // Build queue
  for (const [folderPath, files] of filesByFolder) {
    folderQueue.push({ folderPath, files });
    console.log(`Queue: ${folderPath} has ${files.length} files`);
  }

  console.log(`=== STARTING UPLOAD: ${folderQueue.length} folders ===`);
  console.log('Full queue:', folderQueue.map(f => `${f.folderPath}: ${f.files.length} files`));

  const BATCH_SIZE = 5; // Process 5 folders at a time
  const errors = [];
  let completed = 0;
  let recordsCreated = 0;
  const total = folderQueue.length;

  updateProgress(0, total, 'Starting...');
  showStatus('⚠️ Uploading... (progress saved - can resume if closed)', 'info');

  for (let i = 0; i < folderQueue.length; i += BATCH_SIZE) {
    const batch = folderQueue.slice(i, i + BATCH_SIZE);

    // Save remaining folders for resume (folder paths only)
    const remaining = folderQueue.slice(i).map(f => f.folderPath);
    chrome.storage.local.set({
      pendingUpload: { remaining, completed, total }
    });

    // Process batch: upload files + create records immediately
    const batchPromises = batch.map(async ({ folderPath, files }) => {
      console.log(`\n📁 Processing: ${folderPath} (${files.length} files)`);

      // Upload files in parallel (2 at a time within folder)
      const uploadedFiles = [];
      const PARALLEL_FILES = 2;

      for (let j = 0; j < files.length; j += PARALLEL_FILES) {
        const fileChunk = files.slice(j, j + PARALLEL_FILES);
        const results = await Promise.all(fileChunk.map(async (file) => {
          try {
            const url = await uploadToTempHost(file);
            if (url) {
              console.log(`  ✓ ${file.name}`);
              return { url, filename: file.name };
            }
          } catch (error) {
            console.error(`  ❌ ${file.name}: ${error.message}`);
            errors.push(`${file.name}: ${error.message}`);
          }
          return null;
        }));
        uploadedFiles.push(...results.filter(r => r !== null));
      }

      // Create Airtable record immediately
      if (uploadedFiles.length > 0) {
        try {
          console.log(`  Creating record with ${uploadedFiles.length} files:`, uploadedFiles.map(f => f.filename));
          const result = await createAirtableRecord(uploadedFiles);
          console.log(`  ✓ Record created: ${result.id}`);
          return { success: true, folderPath };
        } catch (error) {
          console.error(`  ❌ Airtable: ${error.message}`);
          errors.push(`${folderPath}: ${error.message}`);
        }
      }
      return { success: false, folderPath };
    });

    const results = await Promise.all(batchPromises);

    // Update progress
    for (const result of results) {
      completed++;
      if (result.success) recordsCreated++;
      updateProgress(completed, total, `${recordsCreated} records created`);
    }

    // Small delay between batches
    if (i + BATCH_SIZE < folderQueue.length) {
      await sleep(100);
    }
  }

  // Clear pending on completion
  chrome.storage.local.remove(['pendingUpload']);

  console.log('\n=== COMPLETE ===');
  console.log(`Records: ${recordsCreated}, Errors: ${errors.length}`);

  if (recordsCreated === 0) {
    showStatus('❌ All failed. Check console (F12).', 'error');
  } else if (errors.length > 0) {
    showStatus(`⚠️ Done! ${recordsCreated} records, ${errors.length} failed`, 'error');
  } else {
    showStatus(`✓ Done! ${recordsCreated} records created!`, 'success');
  }

  selectedFiles = [];
  fileInput.value = '';
  folderInput.value = '';
  displayFileList();
  clearBtn.style.display = 'none';
  uploadBtn.disabled = false;

  setTimeout(() => progressDiv.classList.remove('active'), 5000);
});

// Upload file to catbox.moe (fast, permanent)
async function uploadToTempHost(file, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('reqtype', 'fileupload');
      formData.append('fileToUpload', file);

      const response = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: formData });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const url = await response.text();
      if (url && url.startsWith('https://')) {
        return url.trim();
      }

      throw new Error('Invalid response');
    } catch (error) {
      console.log(`Attempt ${attempt}/${retries} failed for ${file.name}: ${error.message}`);
      if (attempt < retries) {
        await sleep(1000 * attempt);
      } else {
        throw new Error(`Failed after ${retries} attempts: ${error.message}`);
      }
    }
  }
}

// Create new Airtable record with ALL attachments in one record
async function createAirtableRecord(filesArray) {
  const url = `https://api.airtable.com/v0/${currentBase}/${encodeURIComponent(currentTable)}`;

  const payload = {
    fields: {
      "Money Video": filesArray,
      "Status": "Todo"
    }
  };

  console.log('📤 SENDING TO AIRTABLE:');
  console.log('URL:', url);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const responseData = await response.json();

  console.log('📥 AIRTABLE RESPONSE:');
  console.log('Status:', response.status);
  console.log('Data:', JSON.stringify(responseData, null, 2));

  if (!response.ok) {
    throw new Error(`Airtable error: ${responseData.error?.message || response.statusText}`);
  }

  return responseData;
}

// Create multiple Airtable records in one batch (up to 10)
async function createAirtableRecordsBatch(recordsData) {
  const url = `https://api.airtable.com/v0/${currentBase}/${encodeURIComponent(currentTable)}`;

  const payload = {
    records: recordsData.map(({ files }) => ({
      fields: {
        "Money Video": files,
        "Status": "Todo"
      }
    }))
  };

  console.log(`Creating ${recordsData.length} records in batch...`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Airtable batch error: ${errorData.error?.message || response.statusText}`);
  }

  return await response.json();
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
