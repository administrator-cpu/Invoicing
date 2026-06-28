import mongoose from 'mongoose';
import INDIAN_STATES from '../../constants/state.js';

const companyProfileSchema = new mongoose.Schema({
  label: {
    type: String,
    required: [true, 'Please provide a label (e.g., Delhi HQ, Assam Branch)'],
    trim: true
  },
  gstNumber: {
    type: String,
    required: [true, 'Please provide the GST Number'],
    trim: true,
    uppercase: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST Number format']
  },
  address: {
    street: { type: String, trim: true, uppercase: true },
    city: { type: String, trim: true, uppercase: true },
    state: {
      type: String,
      required: [true, 'State is required for tax calculation'],
      enum: {
        values: INDIAN_STATES,
        message: '${VALUE} is not a valid Indian state or Union Territory.'
      },
      trim: true, uppercase: true
    },
    pincode: { type: String, trim: true },
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export default mongoose.model('CompanyProfile', companyProfileSchema);
