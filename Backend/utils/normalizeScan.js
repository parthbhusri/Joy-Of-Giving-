// Gemini occasionally returns slightly-off JSON (an empty string, a rating of
// 0 or 7, a missing field, "true" as text...). The database schema is strict,
// so one odd value would make a perfectly good scan fail to save. This turns
// whatever Gemini returned into a complete, valid assessment.

function toText(value, fallback) {
  if (value === null || value === undefined) return fallback

  const text = String(value).trim()

  return text || fallback
}

function toRating(value) {
  const number = Number(value)

  if (!Number.isFinite(number)) return 3

  return Math.min(5, Math.max(1, Math.round(number)))
}

function toList(value) {
  if (!Array.isArray(value)) return []

  return value.map((item) => toText(item, '')).filter(Boolean)
}

function toBoolean(value, fallback) {
  if (typeof value === 'boolean') return value
  if (value === 'true') return true
  if (value === 'false') return false

  return fallback
}

function toRatingBlock(block, label) {
  return {
    rating: toRating(block?.rating),
    description: toText(
      block?.description,
      `No ${label} details were provided.`
    )
  }
}

export default function normalizeScan(raw) {
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}

  return {
    toyCategory: toText(data.toyCategory, 'Other'),
    toyNameGuess: toText(data.toyNameGuess, 'Unidentified toy'),
    conditionSummary: toText(
      data.conditionSummary,
      'No condition summary was provided.'
    ),
    cleanliness: toRatingBlock(data.cleanliness, 'cleanliness'),
    reusability: toRatingBlock(data.reusability, 'reusability'),
    reliability: toRatingBlock(data.reliability, 'reliability'),
    repairability: toText(data.repairability, 'Unknown'),
    repairabilityReason: toText(
      data.repairabilityReason,
      'No repair notes were provided.'
    ),
    suggestedActions: toList(data.suggestedActions),
    useCase: toText(data.useCase, 'No suggested use was provided.'),
    suggestedAgeRange: toText(
      data.suggestedAgeRange,
      'Not specified (staff review required)'
    ),
    visibleSafetyConcerns: toList(data.visibleSafetyConcerns),
    donationReadiness: toText(
      data.donationReadiness,
      'Needs staff review'
    ),
    battery_operated: toBoolean(data.battery_operated, false),
    battery_note: toText(
      data.battery_note,
      'No visible battery requirement identified from the image.'
    ),
    confidence: toText(data.confidence, 'Low'),
    // Every AI assessment needs staff review, whatever Gemini said.
    staffReviewRequired: true,
    fun_fact: toText(
      data.fun_fact,
      'Giving a toy a second life keeps it out of landfill and puts a smile on a child’s face.'
    )
  }
}
