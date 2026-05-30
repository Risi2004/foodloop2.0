const reviewService = require('../services/reviewService');

function handleServiceError(res, err, fallbackMessage) {
  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || fallbackMessage,
  });
}

async function submitReview(req, res) {
  try {
    const review = await reviewService.submitReview(req.user._id, req.body?.text);
    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It is waiting for admin approval.',
      review,
    });
  } catch (err) {
    console.error('[review] submitReview error:', err);
    return handleServiceError(res, err, 'Failed to submit review.');
  }
}

async function getApprovedReviews(req, res) {
  try {
    const reviews = await reviewService.listApprovedReviews();
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('[review] getApprovedReviews error:', err);
    return handleServiceError(res, err, 'Failed to load reviews.');
  }
}

async function listPendingReviews(req, res) {
  try {
    const reviews = await reviewService.listPendingReviews();
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('[review] listPendingReviews error:', err);
    return handleServiceError(res, err, 'Failed to load pending reviews.');
  }
}

async function approveReview(req, res) {
  try {
    const review = await reviewService.approveReview(req.params.id, req.user?._id);
    return res.json({ success: true, review });
  } catch (err) {
    console.error('[review] approveReview error:', err);
    return handleServiceError(res, err, 'Failed to approve review.');
  }
}

async function rejectReview(req, res) {
  try {
    const review = await reviewService.rejectReview(
      req.params.id,
      req.user?._id,
      req.body?.reason
    );
    return res.json({ success: true, review });
  } catch (err) {
    console.error('[review] rejectReview error:', err);
    return handleServiceError(res, err, 'Failed to reject review.');
  }
}

async function listApprovedReviewsForAdmin(req, res) {
  try {
    const reviews = await reviewService.listApprovedReviewsForAdmin();
    return res.json({ success: true, reviews });
  } catch (err) {
    console.error('[review] listApprovedReviewsForAdmin error:', err);
    return handleServiceError(res, err, 'Failed to load approved reviews.');
  }
}

async function deleteReview(req, res) {
  try {
    await reviewService.deleteReview(req.params.id);
    return res.json({ success: true, message: 'Review deleted.' });
  } catch (err) {
    console.error('[review] deleteReview error:', err);
    return handleServiceError(res, err, 'Failed to delete review.');
  }
}

module.exports = {
  submitReview,
  getApprovedReviews,
  listPendingReviews,
  listApprovedReviewsForAdmin,
  approveReview,
  rejectReview,
  deleteReview,
};
