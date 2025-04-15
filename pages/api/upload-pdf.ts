import type { NextApiRequest, NextApiResponse } from 'next';
import { put } from '@vercel/blob'; // If using Vercel Blob
import { v4 as uuidv4 } from 'uuid';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, clientName } = req.body;
    
    if (!pdfBase64) {
      return res.status(400).json({ error: 'PDF data is required' });
    }
    
    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64.split(',')[1], 'base64');
    
    // Generate a unique filename
    const sanitizedClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `diet_${sanitizedClientName}_${uuidv4()}.pdf`;
    
    // Upload to Vercel Blob (or your preferred storage service)
    const blob = await put(filename, pdfBuffer, {
      contentType: 'application/pdf',
      access: 'public', // Make it publicly accessible
    });
    
    // Return the URL
    return res.status(200).json({ 
      success: true, 
      url: blob.url,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return res.status(500).json({ 
      error: 'Failed to upload PDF' 
    });
  }
}
