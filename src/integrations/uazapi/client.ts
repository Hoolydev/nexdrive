export const uazapiClient = {
  async getQRCode(instanceUrl: string, token: string) {
    const response = await fetch(`${instanceUrl}/instance/qrcode`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Falha ao obter QR Code');
    return response.json() as Promise<{ qrcode: string; connected: boolean }>;
  },

  async getStatus(instanceUrl: string, token: string) {
    const response = await fetch(`${instanceUrl}/instance/status`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error('Falha ao verificar status');
    return response.json() as Promise<{ connected: boolean; phone: string | null }>;
  },

  async sendMessage(instanceUrl: string, token: string, phone: string, message: string) {
    const response = await fetch(`${instanceUrl}/message/text`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, message }),
    });
    if (!response.ok) throw new Error('Falha ao enviar mensagem');
    return response.json();
  },

  async sendImage(instanceUrl: string, token: string, phone: string, imageUrl: string, caption: string) {
    const response = await fetch(`${instanceUrl}/message/image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, image: imageUrl, caption }),
    });
    if (!response.ok) throw new Error('Falha ao enviar imagem');
    return response.json();
  },

  async sendAudio(instanceUrl: string, token: string, phone: string, audioUrl: string) {
    const response = await fetch(`${instanceUrl}/message/audio`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, audio: audioUrl }),
    });
    if (!response.ok) throw new Error('Falha ao enviar áudio');
    return response.json();
  },

  async setWebhook(instanceUrl: string, token: string, webhookUrl: string) {
    const response = await fetch(`${instanceUrl}/instance/webhook`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: webhookUrl, enabled: true }),
    });
    if (!response.ok) throw new Error('Falha ao configurar webhook');
    return response.json();
  },
};
