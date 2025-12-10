/**
 * Score Calculator Utility
 * Handles result processing for the exam system
 * 
 * Scoring System:
 * - Total Questions: 100
 * - Correct Answer: +2 marks
 * - Wrong Answer: -0.5 marks
 * - Maximum Score: 200 marks
 * 
 * Note: All calculations (final score, percentage) are now provided directly
 * from Excel uploads. This utility only validates and formats the data.
 */

/**
 * Create results object from provided data (no calculations)
 * @param {number} correctCount - Number of correct answers
 * @param {number} wrongCount - Number of wrong answers  
 * @param {number} unattemptedCount - Number of unattempted questions
 * @param {number} finalScore - Final score (provided directly)
 * @param {number} percentage - Percentage (provided directly, optional)
 * @returns {object} Complete results object
 */
function createResults(correctCount, wrongCount, unattemptedCount, finalScore, percentage = null) {
  // Validate inputs
  if (correctCount < 0 || wrongCount < 0 || unattemptedCount < 0) {
    throw new Error('Answer counts cannot be negative');
  }

  if (finalScore === undefined || finalScore === null) {
    throw new Error('Final score is required');
  }

  const totalQuestions = 100;
  const totalAnswered = correctCount + wrongCount + unattemptedCount;

  if (totalAnswered !== totalQuestions) {
    throw new Error(`Total answers (${totalAnswered}) must equal ${totalQuestions}`);
  }

  // If percentage not provided, calculate it based on finalScore out of 200 (max possible score)
  const calculatedPercentage = percentage !== null ? percentage : Math.max(0, (finalScore / 200) * 100);

  return {
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    unattempted: unattemptedCount,
    finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
    totalQuestions: totalQuestions,
    percentage: Math.round(calculatedPercentage * 100) / 100 // Round to 2 decimal places
  };
}

/**
 * Validate answer counts and final score before processing
 * @param {number} correct - Correct answers count
 * @param {number} wrong - Wrong answers count
 * @param {number} unattempted - Unattempted count
 * @param {number} finalScore - Final score (required)
 * @returns {boolean} True if valid
 */
function validateResultData(correct, wrong, unattempted, finalScore) {
  const total = correct + wrong + unattempted;
  return total === 100 && correct >= 0 && wrong >= 0 && unattempted >= 0 && finalScore !== undefined && finalScore !== null;
}

/**
 * Get score breakdown for display (no mark calculations)
 * @param {object} results - Results object
 * @returns {object} Formatted breakdown for display
 */
function getScoreBreakdown(results) {
  return {
    correct: {
      count: results.correctAnswers,
      label: `${results.correctAnswers} correct`
    },
    wrong: {
      count: results.wrongAnswers,
      label: `${results.wrongAnswers} wrong`
    },
    unattempted: {
      count: results.unattempted,
      label: `${results.unattempted} unattempted`
    },
    final: {
      score: results.finalScore,
      percentage: results.percentage,
      outOf: 200
    }
  };
}

module.exports = {
  createResults,
  validateResultData,
  getScoreBreakdown
};