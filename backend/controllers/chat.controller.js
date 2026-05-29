const { answerChatMessage } = require('../services/chatRagService');
const { ChatError } = require('../services/geminiChatService');
const { EmbeddingError } = require('../services/geminiEmbeddings');

exports.postMessage = async (req, res) => {
  try {
    const { message, history, language } = req.body || {};

    if (!message || !String(message).trim()) {
      return res.status(400).json({
        success: false,
        code: 'CHAT_INVALID_MESSAGE',
        message: 'Message is required.',
      });
    }

    const result = await answerChatMessage({
      message: String(message).trim(),
      history: Array.isArray(history) ? history : [],
      language: language || 'en',
    });

    return res.json({
      success: true,
      reply: result.reply,
    });
  } catch (err) {
    if (err.code === 'CHAT_KNOWLEDGE_NOT_INDEXED') {
      return res.status(503).json({
        success: false,
        code: err.code,
        message:
          'FoodLoop AI is not ready yet. An administrator must run: npm run chat:ingest',
      });
    }

    if (err instanceof ChatError || err instanceof EmbeddingError) {
      return res.status(err.statusCode || 503).json({
        success: false,
        code: err.code,
        message: err.message,
      });
    }

    console.error('chat.controller postMessage:', err);
    return res.status(500).json({
      success: false,
      code: 'CHAT_ERROR',
      message: err.message || 'Failed to process chat message.',
    });
  }
};
