import mongoose from 'mongoose'

const toyScanSchema = new mongoose.Schema(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    imageObjectName: {
      type: String,
      required: true
    },

    imageMimeType: {
      type: String,
      required: true
    },

    toyCategory: {
      type: String,
      required: true
    },

    toyNameGuess: {
      type: String,
      required: true
    },

    conditionSummary: {
      type: String,
      required: true
    },

    cleanliness: {
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      description: {
        type: String,
        required: true
      }
    },

    reusability: {
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      description: {
        type: String,
        required: true
      }
    },

    reliability: {
      rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
      },
      description: {
        type: String,
        required: true
      }
    },

    repairability: {
      type: String,
      required: true
    },

    repairabilityReason: {
      type: String,
      required: true
    },

    suggestedActions: {
      type: [String],
      default: []
    },

    useCase: {
      type: String,
      required: true
    },

    suggestedAgeRange: {
      type: String,
      required: true
    },

    visibleSafetyConcerns: {
      type: [String],
      default: []
    },

    donationReadiness: {
      type: String,
      required: true
    },

    battery_operated: {
      type: Boolean,
      required: true
    },

    battery_note: {
      type: String,
      required: true
    },

    confidence: {
      type: String,
      required: true
    },

    staffReviewRequired: {
      type: Boolean,
      required: true,
      default: true
    },

    fun_fact: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true
  }
)

const ToyScan = mongoose.model(
  'ToyScan',
  toyScanSchema
)

export default ToyScan