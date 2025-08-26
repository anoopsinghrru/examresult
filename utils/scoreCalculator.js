/**
 * Score Calculator Utility
 * Handles scoring logic for the new exam system
 * 
 * Scoring Rules:
 * - Correct Answer: +2 marks
 * - Wrong Answer: -0.25 marks (1/4 deduction)
 * - Unattempted: 0 marks
 * - Total Questions: 50
 * - Maximum Score: 100 (50 × 2)
 * - Minimum Score: -12.5 (50 × -0.25)
 */

/**
 * Calculate final results based on correct, wrong, and unattempted counts
 * @param {number} correctCount - Number of correct answers
 * @param {number} wrongCount - Number of wrong answers  
 * @param {number} unattemptedCount - Number of unattempted questions
 * @returns {object} Complete results object
 */
function calculateResults(correctCount, wrongCount, unattemptedCount) {
  // Validate inputs
  if (correctCount < 0 || wrongCount < 0 || unattemptedCount < 0) {
    throw new Error('Answer counts cannot be negative');
  }
  
  const totalQuestions = 50;
  const totalAnswered = correctCount + wrongCount + unattemptedCount;
  
  if (totalAnswered !== totalQuestions) {
    throw new Error(`Total answers (${totalAnswered}) must equal ${totalQuestions}`);
  }
  
  // Calculate final score
  const correctMarks = correctCount * 2;
  const wrongMarks = wrongCount * 0.25;
  const finalScore = correctMarks - wrongMarks;
  
  // Calculate percentage (based on maximum possible score of 100)
  const percentage = Math.max(0, (finalScore / 100) * 100);
  
  return {
    correctAnswers: correctCount,
    wrongAnswers: wrongCount,
    unattempted: unattemptedCount,
    finalScore: Math.round(finalScore * 100) / 100, // Round to 2 decimal places
    totalQuestions: totalQuestions,
    percentage: Math.round(percentage * 100) / 100 // Round to 2 decimal places
  };
}

/**
 * Validate answer counts before processing
 * @param {number} correct - Correct answers count
 * @param {number} wrong - Wrong answers count
 * @param {number} unattempted - Unattempted count
 * @returns {boolean} True if valid
 */
function validateAnswerCounts(correct, wrong, unattempted) {
  const total = correct + wrong + unattempted;
  return total === 50 && correct >= 0 && wrong >= 0 && unattempted >= 0;
}

/**
 * Get score breakdown for display
 * @param {object} results - Results object from calculateResults
 * @returns {object} Formatted breakdown for display
 */
function getScoreBreakdown(results) {
  return {
    correct: {
      count: results.correctAnswers,
      marks: results.correctAnswers * 2,
      label: `+${results.correctAnswers * 2} marks`
    },
    wrong: {
      count: results.wrongAnswers,
      marks: results.wrongAnswers * 0.25,
      label: `-${results.wrongAnswers * 0.25} marks`
    },
    unattempted: {
      count: results.unattempted,
      marks: 0,
      label: '0 marks'
    },
    final: {
      score: results.finalScore,
      percentage: results.percentage,
      outOf: 100
    }
  };
}

/**
 * Calculate grade based on percentage
 * @param {number} percentage - Percentage score
 * @returns {string} Grade letter
 */
function calculateGrade(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 33) return 'D';
  return 'F';
}

module.exports = {
  calculateResults,
  validateAnswerCounts,
  getScoreBreakdown,
  calculateGrade
};