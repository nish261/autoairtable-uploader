// Background service worker for handling uploads
// This bypasses CORS restrictions

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'uploadFile') {
    handleFileUpload(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'createRecord') {
    createAirtableRecord(request.data)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Upload file to temporary hosting
async function handleFileUpload(data) {
  const { fileData, fileName, fileType } = data;

  // Convert base64 to blob
  const byteString = atob(fileData.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: fileType });

  // Create FormData
  const formData = new FormData();
  formData.append('file', blob, fileName);

  console.log('Background: Uploading to tmpfiles.org, size:', blob.size);

  try {
    // Try tmpfiles.org first (better CORS support)
    const response = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData
    });

    console.log('tmpfiles.org response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('tmpfiles.org response:', result);

      if (result.status === 'success' && result.data && result.data.url) {
        // tmpfiles.org returns a URL like: https://tmpfiles.org/ABC123
        // We need to convert it to direct download URL
        const directUrl = result.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        return directUrl;
      }
    }

    // Fallback to file.io
    console.log('Trying file.io as fallback...');
    const fileIoResponse = await fetch('https://file.io/?expires=1d', {
      method: 'POST',
      body: formData
    });

    if (!fileIoResponse.ok) {
      throw new Error(`File upload failed: ${fileIoResponse.status}`);
    }

    const fileIoData = await fileIoResponse.json();
    console.log('file.io response:', fileIoData);

    if (fileIoData.success && fileIoData.link) {
      return fileIoData.link;
    }

    throw new Error('Failed to upload file to any hosting service');

  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

// Create Airtable record
async function createAirtableRecord(data) {
  const { apiKey, baseId, tableId, fileName, fileUrl } = data;

  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableId)}`;

  const payload = {
    fields: {
      "Money Video": [
        {
          url: fileUrl,
          filename: fileName
        }
      ],
      "Status": "Todo"
    }
  };

  console.log('Background: Creating Airtable record');
  console.log('URL:', url);
  console.log('Payload:', payload);

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
  console.log('Airtable success:', result);
  return result;
}
