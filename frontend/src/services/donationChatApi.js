export const getDonationChat = async () => ({
  success: true,
  messages: [],
});

export const sendDonationChatMessage = async (_donationId, text) => ({
  success: true,
  message: {
    id: `local-${Date.now()}`,
    senderId: 'offline',
    senderName: 'You',
    text,
    createdAt: new Date().toISOString(),
  },
});
